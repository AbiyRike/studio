
"use client";

import { useState, type FormEvent, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { summarizeAndGetDataForStorage, type SummarizeAndGetDataForStorageInput } from "@/app/actions";
import { Loader2, FileText, Mic, Video, Camera, StopCircle, UploadCloud, X, CheckCircle, Home } from 'lucide-react'; // Added Home
import { addKnowledgeBaseItem, type KnowledgeBaseItem } from '@/lib/knowledge-base-store';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export function KnowledgeBuilderUploader() {
  const [documentName, setDocumentName] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Microphone and camera states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImageDataUri, setCapturedImageDataUri] = useState<string | null>(null);

  const resetForm = () => {
    setDocumentName("");
    setDocumentContent("");
    setCapturedImageDataUri(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsSuccess(false);
    // Potentially reset camera/mic states if needed
    setIsCameraOpen(false);
    setIsRecording(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      resetOtherInputs('pdf');
      if (file.type === "application/pdf") {
        setDocumentName(file.name.replace(/\.pdf$/i, ""));
        setDocumentContent(""); 
        setIsLoading(true);
        toast({ title: "Processing PDF...", description: "Extracting text from PDF." });
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
            description: "Could not extract text. Ensure it's a valid PDF.",
            variant: "destructive",
          });
          setDocumentContent("Error extracting text from PDF.");
        } finally {
          setIsLoading(false);
        }
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
      }
    }
  };

  const resetOtherInputs = (activeInputType: 'text' | 'pdf' | 'mic' | 'camera') => {
    if (activeInputType !== 'text') setDocumentContent(""); // Clear text unless it's the primary input
    if (activeInputType !== 'pdf' && fileInputRef.current) fileInputRef.current.value = "";
    if (activeInputType !== 'camera') setCapturedImageDataUri(null);
    if (activeInputType !== 'mic') {
        // Stop recording if it was active
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    }
    if (activeInputType !== 'camera') {
        // Close camera if it was active
        if (isCameraOpen) {
            setIsCameraOpen(false);
             if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
             }
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
        setDocumentContent("Audio recording captured. (Note: Actual transcription requires a separate AI service. This placeholder text will be used for summarization).");
        toast({
          title: "Recording Finished",
          description: "Audio captured. Using placeholder text for now.",
        });
        stream.getTracks().forEach(track => track.stop()); // Release microphone
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone Access Denied",
        description: "Please enable microphone permissions.",
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
      setIsCameraOpen(false); // Automatically close if permission denied
    }
  }, [isCameraOpen, toast]);

  useEffect(() => {
    getCameraPermission();
    return () => { // Cleanup camera stream
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, getCameraPermission]);

  const handleToggleCamera = () => {
    if (capturedImageDataUri) {
      setCapturedImageDataUri(null);
      setDocumentName("");
      setDocumentContent("");
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
        setDocumentContent("Visual content captured from camera. (AI will analyze the image).");
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
    } else {
        toast({ title: "Camera Error", description: "Could not capture image. Ensure camera is active.", variant: "destructive"});
    }
  };

  const clearCapturedImage = () => {
    setCapturedImageDataUri(null);
    if (documentName.startsWith("Camera Capture")) setDocumentName("");
    if (documentContent.startsWith("Visual content captured")) setDocumentContent("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSuccess(false);
    
    let currentDocumentContent = documentContent;
    if (capturedImageDataUri && !documentContent.trim()) {
      currentDocumentContent = `Image analysis target: ${documentName}`;
    }

    if (!documentName.trim() || (!currentDocumentContent.trim() && !capturedImageDataUri)) {
      toast({
        title: "Missing Information",
        description: "Please provide a document name and content (text, PDF, image, or audio).",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    const processInput: SummarizeAndGetDataForStorageInput = {
      documentName,
      documentContent: currentDocumentContent,
      mediaDataUri: capturedImageDataUri || undefined,
    };

    const result = await summarizeAndGetDataForStorage(processInput);
    setIsLoading(false);

    if ('error' in result) {
      toast({
        title: "Error Processing Content",
        description: result.error,
        variant: "destructive",
      });
    } else {
      addKnowledgeBaseItem(result); // result is KnowledgeBaseItem like
      toast({
        title: "Knowledge Item Added!",
        description: `"${result.documentName}" has been summarized and saved.`,
      });
      setIsSuccess(true);
      // router.push('/dashboard'); // Or a page to view knowledge base
    }
  };

  if (isSuccess) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl font-headline">Content Added to Knowledge Base!</CardTitle>
          <CardDescription>
            "{documentName}" has been successfully processed and saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
           <Button onClick={resetForm} className="w-full sm:w-auto">Add Another Item</Button>
           <Button variant="outline" onClick={() => router.push('/dashboard')} className="w-full sm:w-auto">
            <Home className="mr-2 h-4 w-4" /> Back to Dashboard
           </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Build Your Knowledge Base</CardTitle>
        <CardDescription>
          Add content (text, PDF, audio, image) to generate a summary and save it for future reference and learning.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="documentName" className="text-lg">Document Name / Title</Label>
            <Input
              id="documentName"
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="e.g., Photosynthesis Overview, Meeting Notes Q1"
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
              onChange={(e) => { setDocumentContent(e.target.value); resetOtherInputs('text');}}
              placeholder="Paste text, or this will be auto-filled by PDF/audio. For camera, this can be a description."
              className="mt-1 min-h-[100px] text-sm"
              disabled={isLoading || !!capturedImageDataUri}
            />
             {capturedImageDataUri && <p className="text-xs text-muted-foreground mt-1">Text content is optional if an image is captured. AI will analyze the image.</p>}
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Input Options (select one to populate content):</p>
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
                {isRecording ? "Stop Recording" : "Record Audio"}
              </Button>
              
              <Button type="button" variant="outline" disabled={isLoading || isRecording} onClick={handleToggleCamera}>
                <Video className="mr-2 h-5 w-5" /> {isCameraOpen ? "Close Camera" : (capturedImageDataUri ? "Retake Photo" : "Capture Image")}
              </Button>
            </div>
          </div>

          {isCameraOpen && hasCameraPermission === false && (
             <Alert variant="destructive">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access in your browser settings. You might need to refresh.
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
                <img src={capturedImageDataUri} alt="Captured preview" className="max-w-full max-h-64 rounded-md border" />
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
                Processing & Saving...
              </>
            ) : (
             <> <UploadCloud className="mr-2 h-5 w-5" /> Add to Knowledge Base </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
