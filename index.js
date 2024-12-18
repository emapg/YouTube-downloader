const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 3000;

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

    try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        const filter = format === 'mp3' ? 'audioonly' : 'video';

        res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);

        const stream = ytdl(url, {
            format,
            filter,
            quality
        });

        if (format === 'mp3' || format === 'flac' || format === 'avi') {
            ffmpeg(stream)
                .toFormat(format)
                .on('error', (err) => {
                    console.error(err);
                    res.status(500).send('Error processing video');
                })
                .pipe(res, { end: true });
        } else {
            stream.pipe(res);
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

    try {
        const info = await ytdl.getInfo(url);
        res.json(info.videoDetails);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving video info');
    }
});

app.get('/playlist', async (req, res) => {
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

    try {
        const playlist = await ytdl.getInfo(url);
        const title = playlist.videoDetails.title;

        res.header('Content-Disposition', `attachment; filename="${title}.${format}"`);

        const stream = ytdl(url, {
            format,
            quality
        });

        if (format === 'mp3' || format === 'flac' || format === 'avi') {
            ffmpeg(stream)
                .toFormat(format)
                .on('error', (err) => {
                    console.error(err);
                    res.status(500).send('Error processing video');
                })
                .pipe(res, { end: true });
        } else {
            stream.pipe(res);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Error downloading playlist');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
