const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
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
    const url = req.query.url;
    const format = req.query.format || 'mp4';
    const quality = req.query.quality || 'highest';

    if (!url) {
        return res.status(400).send('URL is required');
    }

    if (!FORMATS[format]) {
        return res.status(400).send('Unsupported format');
    }

    if (!QUALITIES.includes(quality)) {
        return res.status(400).send('Unsupported quality option');
    }

    if (!ytdl.validateURL(url)) {
        return res.status(400).send('Invalid YouTube URL');
    }

    try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;

        res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);

        const stream = ytdl(url, {
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
        console.error(err);
        res.status(500).send('Error downloading video');
    }
});

app.get('/info', async (req, res) => {
    const url = req.query.url;

    if (!url) {
        return res.status(400).send('URL is required');
    }

    if (!ytdl.validateURL(url)) {
        return res.status(400).send('Invalid YouTube URL');
    }

    try {
        const info = await ytdl.getInfo(url);
        res.json(info.videoDetails);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving video info');
    }
});

// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
