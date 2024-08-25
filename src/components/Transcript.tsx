import React, { useState } from 'react';

interface Comment {
  id: string;
  text: string;
  timestamp: number;
}

const Transcript: React.FC = () => {
  const [transcript, setTranscript] = useState<string>(''); 
  const [comments, setComments] = useState<Comment[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleAddComment = (text: string, timestamp: number) => {
    const newComment = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      timestamp,
    };
    setComments([...comments, newComment]);
  };

  const handleAudioUpload = async () => {
    if (!audioFile) return;

    const formData = new FormData();
    formData.append('audio', audioFile);

    try {
      const response = await fetch('https://api.assemblyai.com/v2/upload', {
        method: 'POST',
        headers: {
          'Authorization': 'YOUR_ASSEMBLYAI_API_KEY',
        },
        body: formData,
      });

      const data = await response.json();
      const transcriptId = data.id;

      // Polling for the transcript result
      let transcriptResponse;
      while (true) {
        transcriptResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
          headers: {
            'Authorization': 'YOUR_ASSEMBLYAI_API_KEY',
          },
        });
        const transcriptData = await transcriptResponse.json();
        if (transcriptData.status === 'completed') {
          setTranscript(transcriptData.text);
          break;
        } else if (transcriptData.status === 'failed') {
          throw new Error('Transcription failed');
        }
        await new Promise(res => setTimeout(res, 5000)); // Wait before polling again
      }
    } catch (error) {
      console.error('Error uploading audio file:', error);
    }
  };

  return (
    <div>
      <h2>Transcript</h2>
      <textarea
        placeholder="Paste transcript here, or upload audio to generate"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />
      
      <div>
        <input 
          type="file" 
          accept="audio/*" 
          onChange={(e) => setAudioFile(e.target.files ? e.target.files[0] : null)} 
        />
        <button onClick={handleAudioUpload}>Upload and Generate Transcript</button>
      </div>

      <div>
        <h3>Comments</h3>
        {comments.map((comment) => (
          <div key={comment.id}>
            <p>
              <strong>Timestamp: {comment.timestamp}s</strong>
              <br />
              {comment.text}
            </p>
          </div>
        ))}
      </div>

      <div>
        <textarea
          placeholder="Add a comment"
          onBlur={(e) => handleAddComment(e.target.value, 0)} // Example timestamp
        />
      </div>
    </div>
  );
};

export default Transcript;

