export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    // בדיקה אם הדפדפן תומך במיקרופון
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('דפדפן זה לא תומך במיקרופון');
      return false;
    }

    // בקשת הרשאה למיקרופון
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // סגירת הסטרים מיד (אנחנו רק בודקים הרשאה)
    stream.getTracks().forEach(track => track.stop());
    
    return true;
  } catch (error) {
    console.error('Error requesting microphone permission:', error);
    return false;
  }
}

export async function startRecording(): Promise<MediaRecorder | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      // כאן אפשר לעשות משהו עם ההקלטה, למשל לשלוח לשרת
      console.log('Recording finished:', audioUrl);
      
      // שחרור המשאבים
      stream.getTracks().forEach(track => track.stop());
    };

    return mediaRecorder;
  } catch (error) {
    console.error('Error starting recording:', error);
    return null;
  }
}