// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '../utils.ts';

interface DictationButtonProps {
    onTranscriptFill: (parsedData: any) => void;
    type: 'task' | 'client';
    context?: string;
    className?: string;
}

export function DictationButton({ onTranscriptFill, type, context, className }: DictationButtonProps) {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = async (event: any) => {
                setIsListening(false);
                const transcript = event.results[0][0].transcript;
                if (transcript) {
                    setIsProcessing(true);
                    try {
                        const { gemini } = await import('../services/gemini');
                        const data = await gemini.parseDictation(transcript, type, context);
                        if (data) {
                            onTranscriptFill(data);
                        }
                    } catch (e) {
                        console.error("Dictation process error", e);
                    } finally {
                        setIsProcessing(false);
                    }
                }
            };

            recognitionRef.current.onerror = (e: any) => {
                console.error("Speech reco error:", e.error);
                setIsListening(false);
                setIsProcessing(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [type, context, onTranscriptFill]);

    const toggleListen = () => {
        if (isProcessing) return;
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            if (!recognitionRef.current) {
                alert("Speech Recognition is not supported in this browser.");
                return;
            }
            setIsListening(true);
            recognitionRef.current.start();
        }
    };

    return (
        <button
            type="button"
            onClick={toggleListen}
            disabled={isProcessing}
            title={isListening ? "Listening... click to stop" : "Dictate via AI"}
            className={cn(
                "p-2 rounded-full transition-all flex items-center justify-center relative shadow-sm",
                isListening ? "bg-red-500 text-white animate-pulse" : "bg-[#1A1A2E] text-white hover:bg-gray-800",
                isProcessing && "opacity-50 cursor-not-allowed",
                className
            )}
        >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
            {isListening && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
            )}
        </button>
    );
}
 
