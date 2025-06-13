
"use client";

import { useState, type FormEvent, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { processContentForTutor } from "@/app/actions";
import { Loader2, FileText, Mic, Video, Camera, StopCircle, UploadCloud, X } from 'lucide-react';
import { setTemporarySessionData } from '@/lib/session-store';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ContentUploader() {
  const [documentName, setDocumentName] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // PDF Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Microphone
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Camera
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setDocumentName(file.name);
        // Simulate PDF text extraction
        // For actual extraction, a library like pdf.js would be needed.
        setDocumentContent(`Content from PDF: ${file.name}. (Full text extraction simulated).`);
        toast({
          title: "PDF Selected",
          description: `${file.name} is ready to be processed.`,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // const audioUrl = URL.createObjectURL(audioBlob);
        // In a real app, you might upload this blob or send to Speech-to-Text API
        setDocumentName(`Audio Recording - ${new Date().toLocaleString()}.wav`);
        setDocumentContent("Audio recording captured. (Simulated transcription).");
        toast({
          title: "Recording Finished",
          description: "Audio captured and ready for processing.",
        });
        // Clean up streams
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
      setIsCameraOpen(false); // Close camera UI if permission denied
    }
  }, [isCameraOpen, toast]);

  useEffect(() => {
    getCameraPermission();
    return () => { // Cleanup stream on component unmount or when camera closes
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, getCameraPermission]);


  const handleToggleCamera = () => {
    // If there's a captured image, clear it before reopening camera.
    if (capturedImage) {
      setCapturedImage(null);
      setDocumentContent("");
      setDocumentName("");
    }
    setIsCameraOpen(prev => !prev);
    if (isCameraOpen) setHasCameraPermission(null); // Reset permission status when closing
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUrl = canvas.toDataURL('image/png');
        setCapturedImage(imageDataUrl);
        setDocumentName(`Camera Capture - ${new Date().toLocaleString()}.png`);
        setDocumentContent("Image captured from camera. (Simulated image analysis).");
        toast({
          title: "Image Captured",
          description: "Image ready for processing.",
        });
      }
      // Stop camera stream after capture
       if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraOpen(false);
      setHasCameraPermission(null);
    }
  };


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!documentName.trim() || !documentContent.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a document name and content. This can be from text, PDF, mic, or camera.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const result = await processContentForTutor(documentName, documentContent);
    setIsLoading(false);

    if ('error' in result) {
      toast({
        title: "Error Processing Content",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setTemporarySessionData(result);
      toast({
        title: "Content Processed!",
        description: "Starting your learning session...",
      });
      router.push('/tutor');
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Start a New Learning Session</CardTitle>
        <CardDescription>
          Enter text, upload a PDF, record audio, or capture an image to begin.
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
              placeholder="e.g., Photosynthesis Basics"
              className="mt-1"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="documentContent" className="text-lg">Document Content / Description</Label>
            <Textarea
              id="documentContent"
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              placeholder="Paste text, or this will be auto-filled by PDF, mic, or camera input..."
              className="mt-1 min-h-[150px] text-sm"
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Input Options:</p>
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
                <Video className="mr-2 h-5 w-5" /> {isCameraOpen ? "Close Camera" : "Use Camera"}
              </Button>
            </div>
          </div>

          {isCameraOpen && hasCameraPermission === false && (
             <Alert variant="destructive">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access in your browser settings to use this feature. You might need to refresh the page after granting permission.
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

          {capturedImage && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Captured Image Preview</CardTitle>
                 <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => {setCapturedImage(null); setDocumentContent(""); setDocumentName("");}}>
                  <X className="h-4 w-4"/>
                  <span className="sr-only">Clear captured image</span>
                </Button>
              </CardHeader>
              <CardContent className="p-4 flex justify-center">
                <img src={capturedImage} alt="Captured" className="max-w-full max-h-64 rounded-md" />
              </CardContent>
            </Card>
          )}


          <Button type="submit" className="w-full text-lg py-3" disabled={isLoading || isRecording || (isCameraOpen && !capturedImage) }>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
             <> <UploadCloud className="mr-2 h-5 w-5" /> Start Tutoring Session </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


    