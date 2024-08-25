const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

const transcribeService = new AWS.TranscribeService();

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
    const audioFilePath = req.file.path;
    const audioFileName = path.basename(audioFilePath);

    const params = {
        TranscriptionJobName: `transcription-${Date.now()}`,
        LanguageCode: 'en-US', // Set the language code for transcription
        MediaFormat: 'mp3', // or wav, flac, etc., depending on the audio format
        Media: {
            MediaFileUri: `s3://YOUR_S3_BUCKET/${audioFileName}`,
        },
        OutputBucketName: 'YOUR_S3_BUCKET',
    };

    try {
        // Upload audio file to S3
        const s3 = new AWS.S3();
        const fileStream = fs.createReadStream(audioFilePath);
        await s3.upload({
            Bucket: 'YOUR_S3_BUCKET',
            Key: audioFileName,
            Body: fileStream,
        }).promise();

        // Start the transcription job
        await transcribeService.startTranscriptionJob(params).promise();

        // Poll for the transcription result
        let transcript = '';
        let jobCompleted = false;
        while (!jobCompleted) {
            const result = await transcribeService.getTranscriptionJob({ TranscriptionJobName: params.TranscriptionJobName }).promise();
            if (result.TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
                const transcriptUri = result.TranscriptionJob.Transcript.TranscriptFileUri;
                const transcriptResponse = await fetch(transcriptUri);
                const transcriptData = await transcriptResponse.json();
                transcript = transcriptData.results.transcripts[0].transcript;
                jobCompleted = true;
            } else if (result.TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
                throw new Error('Transcription failed');
            }
            await new Promise(res => setTimeout(res, 5000)); // Wait before polling again
        }

        res.json({ transcript });
    } catch (error) {
        console.error('Error processing transcription:', error);
        res.status(500).json({ error: 'Failed to transcribe audio' });
    } finally {
        fs.unlinkSync(audioFilePath); // Clean up the uploaded file
    }
});

app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
