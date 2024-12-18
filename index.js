const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const url = require('url');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const FORMATS = {
    mp4: 'mp4',
    mp3: 'mp3',
    webm: 'webm',
    flac: 'flac',
    avi: 'avi'
};

const QUALITIES = ['highest', 'highestaudio', 'highestvideo', 'lowest', 'lowestaudio', 'lowestvideo', '140'];

app.get('/download', async (req, res) => {
    const videoUrl = req.query.url;
    const format = req.query.format || 'mp4';
    const quality = req.query.quality || 'highest';

    if (!videoUrl) {
        return res.status(400).send('URL is required');
    }

    if (!FORMATS[format]) {
        return res.status(400).send('Unsupported format');
    }

    if (!QUALITIES.includes(quality)) {
        return res.status(400).send('Unsupported quality option');
    }

    // Parse and validate the YouTube URL
    const parsedUrl = url.parse(videoUrl, true);
    if (!ytdl.validateURL(parsedUrl.href)) {
        return res.status(400).send('Invalid YouTube URL');
    }

    try {
        const info = await ytdl.getInfo(parsedUrl.href);
        const title = info.videoDetails.title;

        res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);

        const stream = ytdl(parsedUrl.href, {
            quality,
            filter: format === 'mp3' ? 'audioonly' : 'video'
        });

        if (format === 'mp3' || format === 'flac' || format === 'avi') {
            ffmpeg(stream)
                .toFormat(format)
                .on('progress', (progress) => {
                    console.log(`Processing: ${progress.percent}% done`);
                })
                .on('error', (err) => {
                    console.error(err);
                    res.status(500).send('Error processing video');
                })
                .pipe(res, { end: true });
        } else {
            stream.on('progress', (chunkLength, downloaded, total) => {
                console.log(`Downloaded ${(downloaded / total * 100).toFixed(2)}%`);
            }).pipe(res);
        }
    } catch (err) {
        if (err.code === 'ENOTFOUND') {
            res.status(410).send('Video not found: The video has been deleted or is no longer accessible');
        } else {
            console.error(err);
            res.status(500).send('Error downloading video: ' + err.message);
        }
    }
});

app.get('/info', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).send('URL is required');
    }

    // Parse and validate the YouTube URL
    const parsedUrl = url.parse(videoUrl, true);
    if (!ytdl.validateURL(parsedUrl.href)) {
        return res.status(400).send('Invalid YouTube URL');
    }

    try {
        const info = await ytdl.getInfo(parsedUrl.href);
        res.json(info.videoDetails);
    } catch (err) {
        if (err.code === 'ENOTFOUND') {
            res.status(410).send('Video not found: The video has been deleted or is no longer accessible');
        } else {
            console.error(err);
            res.status(500).send('Error retrieving video info: ' + err.message);
        }
    }
});

// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
