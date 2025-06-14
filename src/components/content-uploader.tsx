
"use client";

import { useState, type FormEvent, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { processContentForTutor, type ProcessContentInput, type TutorSessionData } from "@/app/actions";
import { Loader2, FileText, Mic, Video, Camera, StopCircle, UploadCloud, X } from 'lucide-react';
import { setActiveTutorSession } from '@/lib/session-store';
import { addKnowledgeBaseItem, generateId } from '@/lib/knowledge-base-store';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}


export function ContentUploader() {
  const [documentName, setDocumentName] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImageDataUri, setCapturedImageDataUri] = useState<string | null>(null);


  const resetOtherInputs = (activeInputType: 'text' | 'pdf' | 'mic' | 'camera') => {
    if (activeInputType !== 'text') setDocumentContent("");
    if (activeInputType !== 'pdf' && fileInputRef.current) fileInputRef.current.value = "";
    if (activeInputType !== 'camera') setCapturedImageDataUri(null);
    if (activeInputType !== 'mic' && mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
    }
    if (activeInputType !== 'camera' && isCameraOpen) {
        setIsCameraOpen(false);
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetOtherInputs('pdf');
      setDocumentName(file.name.replace(/\.pdf$/i, ""));
      setIsLoading(true);
      toast({ title: "Processing PDF...", description: "Extracting text from PDF." });
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
        let textContent = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map(item => ('str' in item ? item.str : '')).join(" ") + "\n";
        }
        setDocumentContent(textContent.trim());
        toast({
          title: "PDF Processed",
          description: `${file.name} text extracted. Ready to submit.`,
        });
      } catch (error) {
        console.error("Error processing PDF:", error);
        toast({
          title: "PDF Processing Error",
          description: "Could not extract text from PDF. Ensure it's a valid PDF.",
          variant: "destructive",
        });
        setDocumentContent("Error extracting text from PDF.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startRecording = async () => {
    resetOtherInputs('mic');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        setDocumentName(`Audio Recording - ${new Date().toLocaleTimeString()}.wav`);
        setDocumentContent("Audio recording captured. (Actual transcription would require an AI speech-to-text service).");
        toast({
          title: "Recording Finished",
          description: "Audio captured. Using simulated text for now.",
        });
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone Access Denied",
        description: "Please enable microphone permissions in your browser settings.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const getCameraPermission = useCallback(async () => {
    if (!isCameraOpen) {
       if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions in your browser settings.',
      });
      setIsCameraOpen(false);
    }
  }, [isCameraOpen, toast]);

  useEffect(() => {
    getCameraPermission();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, getCameraPermission]);


  const handleToggleCamera = () => {
    if (capturedImageDataUri) { 
      setCapturedImageDataUri(null);
      setDocumentName("");
    }
    resetOtherInputs('camera');
    setIsCameraOpen(prev => !prev);
    if (isCameraOpen) setHasCameraPermission(null); 
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/png');
        setCapturedImageDataUri(imageDataUrl);
        setDocumentName(`Camera Capture - ${new Date().toLocaleTimeString()}.png`);
        setDocumentContent("Visual content captured from camera."); 
        toast({
          title: "Image Captured",
          description: "Image ready for processing.",
        });
      }
       if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraOpen(false);
      setHasCameraPermission(null);
    } else {
       toast({ title: "Camera Error", description: "Could not capture image. Ensure camera is active.", variant: "destructive"});
    }
  };

  const clearCapturedImage = () => {
    setCapturedImageDataUri(null);
    if (documentName.startsWith("Camera Capture")) setDocumentName("");
    if (documentContent.startsWith("Visual content captured")) setDocumentContent("");
  }


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    let currentDocumentContent = documentContent;
    if (capturedImageDataUri && !documentContent.trim()) {
      currentDocumentContent = `Image analysis: ${documentName}`; 
    }

    if (!documentName.trim() || (!currentDocumentContent.trim() && !capturedImageDataUri)) {
      toast({
        title: "Missing Information",
        description: "Please provide a document name and either text content or a captured image/PDF.",
        variant: "destructive",
      });
      return;
    }
    
    setActiveTutorSession(null); 
    setIsLoading(true);

    const processInput: ProcessContentInput = {
      documentName,
      documentContent: currentDocumentContent,
      mediaDataUri: capturedImageDataUri || undefined,
    };

    const result = await processContentForTutor(processInput);
    

    if ('error' in result) {
      setIsLoading(false);
      toast({
        title: "Error Processing Content",
        description: result.error,
        variant: "destructive",
      });
    } else {
      // Add to knowledge base
      const now = new Date().toISOString();
      addKnowledgeBaseItem({
        id: generateId(),
        documentName: result.documentName,
        documentContent: result.documentContent, // Original content from TutorSessionData
        mediaDataUri: result.mediaDataUri,     // Original media URI from TutorSessionData
        summary: result.summary,               // AI-generated summary from TutorSessionData
        createdAt: now,
        updatedAt: now,
      });
      toast({
        title: "Content Processed & Saved!",
        description: `"${result.documentName}" added to knowledge base. Starting quiz...`,
      });
      setActiveTutorSession(result);
      setIsLoading(false); // Set loading to false before navigation
      router.push('/tutor');
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Start a New Quiz Session</CardTitle>
        <CardDescription>
          Upload new content (text, PDF, audio, image). It will be added to your knowledge base and a quiz will start.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="documentName" className="text-lg">Document Name</Label>
            <Input
              id="documentName"
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., Photosynthesis Basics, My Vacation Photo"
              className="mt-1"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="documentContent" className="text-lg">Text Content / Description</Label>
            <Textarea
              id="documentContent"
              value={documentContent}
              onChange={(e) => {setDocumentContent(e.target.value); resetOtherInputs('text');}}
              placeholder="Paste text, or this will be auto-filled by PDF/audio. For camera, this can be a description."
              className="mt-1 min-h-[100px] text-sm"
              disabled={isLoading || !!capturedImageDataUri} 
            />
             {capturedImageDataUri && <p className="text-xs text-muted-foreground mt-1">Text content is optional when an image is captured. The AI will analyze the image.</p>}
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Input Options (select one):</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Button type="button" variant="outline" disabled={isLoading || isRecording || isCameraOpen} onClick={() => fileInputRef.current?.click()}>
                <FileText className="mr-2 h-5 w-5" /> Upload PDF
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf" style={{ display: 'none' }} />
              
              <Button 
                type="button" 
                variant={isRecording ? "destructive" : "outline"} 
                disabled={isLoading || isCameraOpen} 
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <StopCircle className="mr-2 h-5 w-5 animate-pulse" /> : <Mic className="mr-2 h-5 w-5" />}
                {isRecording ? "Stop Recording" : "Use Microphone"}
              </Button>
              
              <Button type="button" variant="outline" disabled={isLoading || isRecording} onClick={handleToggleCamera}>
                <Video className="mr-2 h-5 w-5" /> {isCameraOpen ? "Close Camera" : (capturedImageDataUri ? "Retake Photo" : "Use Camera")}
              </Button>
            </div>
          </div>

          {isCameraOpen && hasCameraPermission === false && (
             <Alert variant="destructive">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access in your browser settings. You might need to refresh after granting permission.
              </AlertDescription>
            </Alert>
          )}

          {isCameraOpen && hasCameraPermission && (
            <Card className="mt-4">
              <CardContent className="p-4 space-y-3">
                <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                <Button type="button" onClick={captureImage} className="w-full" disabled={isLoading}>
                  <Camera className="mr-2 h-5 w-5" /> Capture Photo
                </Button>
              </CardContent>
            </Card>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {capturedImageDataUri && !isCameraOpen && (
            <Card className="mt-4 relative">
              <CardHeader>
                <CardTitle className="text-lg">Captured Image Preview</CardTitle>
                 <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={clearCapturedImage} aria-label="Clear captured image">
                  <X className="h-4 w-4"/>
                </Button>
              </CardHeader>
              <CardContent className="p-4 flex justify-center">
                <img src={capturedImageDataUri} alt="Captured" className="max-w-full max-h-64 rounded-md border" />
              </CardContent>
            </Card>
          )}


          <Button 
            type="submit" 
            className="w-full text-lg py-3" 
            disabled={isLoading || isRecording || (isCameraOpen && !capturedImageDataUri) || (!documentContent.trim() && !capturedImageDataUri && !fileInputRef.current?.files?.length && !isRecording) }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing & Starting Quiz...
              </>
            ) : (
             <> <UploadCloud className="mr-2 h-5 w-5" /> Process & Start Quiz </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
