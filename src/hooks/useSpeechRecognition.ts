import { useState, useEffect, useRef, useCallback } from 'react';

// SpeechRecognition interfaces for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const onResultCallbackRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    const win = window as unknown as IWindow;
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ja-JP';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interimChunk += event.results[i][0].transcript;
          }
        }

        if (finalChunk && onResultCallbackRef.current) {
          onResultCallbackRef.current(finalChunk);
        }
        setTranscript(interimChunk || finalChunk);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event note:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('マイクへのアクセスが許可されていません');
        } else if (event.error === 'no-speech') {
          // ignore silent pause
        } else {
          setErrorMessage(`音声認識エラー (${event.error})`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('Speech recognition init error:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!recognitionRef.current) {
      setErrorMessage('お使いのブラウザは音声入力に対応していません');
      return;
    }
    setErrorMessage(null);
    setTranscript('');
    onResultCallbackRef.current = onResult;

    try {
      recognitionRef.current.start();
    } catch (e) {
      // If already started, stop then restart
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 150);
      } catch (err) {
        console.warn('Recognition start error', err);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(
    (onResult: (text: string) => void) => {
      if (isListening) {
        stopListening();
      } else {
        startListening(onResult);
      }
    },
    [isListening, startListening, stopListening]
  );

  return {
    isListening,
    transcript,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
  };
}
