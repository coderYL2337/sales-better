const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const transcribeService = new AWS.TranscribeService();

exports.handler = async (event) => {
    const { audioFileName, audioFileContent } = event;
    const s3Bucket = 'YOUR_S3_BUCKET';
    
    try {
        const s3Params = {
            Bucket: s3Bucket,
            Key: audioFileName,
            Body: Buffer.from(audioFileContent, 'base64'),
            ContentType: 'audio/mpeg',
        };

        await s3.upload(s3Params).promise();

        const transcriptionJobName = `transcription-${Date.now()}`;
        const transcribeParams = {
            TranscriptionJobName: transcriptionJobName,
            LanguageCode: 'en-US',
            MediaFormat: 'mp3',
            Media: {
                MediaFileUri: `s3://${s3Bucket}/${audioFileName}`,
            },
            OutputBucketName: s3Bucket,
        };

        await transcribeService.startTranscriptionJob(transcribeParams).promise();

        let jobCompleted = false;
        let transcript = '';
        while (!jobCompleted) {
            const { TranscriptionJob } = await transcribeService.getTranscriptionJob({
                TranscriptionJobName: transcriptionJobName,
            }).promise();

            if (TranscriptionJob.TranscriptionJobStatus === 'COMPLETED') {
                const transcriptUri = TranscriptionJob.Transcript.TranscriptFileUri;
                const transcriptResponse = await fetch(transcriptUri);
                const transcriptData = await transcriptResponse.json();
                transcript = transcriptData.results.transcripts[0].transcript;
                jobCompleted = true;
            } else if (TranscriptionJob.TranscriptionJobStatus === 'FAILED') {
                throw new Error('Transcription failed');
            }

            await new Promise(res => setTimeout(res, 5000));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ transcript }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to transcribe audio' }),
        };
    }
};
