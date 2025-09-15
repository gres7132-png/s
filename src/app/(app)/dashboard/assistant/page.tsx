
"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { useCompletion } from 'ai/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { askAssistant } from "@/ai/flows/assistant-flow";
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const { complete, completion, error } = useCompletion({
    api: '/api/genkit/stream', // This is a conventional endpoint for streaming with genkit
    body: {
        flowId: 'assistantFlow'
    }
  });
  
  useEffect(() => {
    const initialMessage: Message = {
      role: 'assistant',
      content: `Hello ${user?.displayName || 'there'}! I'm your virtual assistant. How can I help you today? You can ask me about how YieldLink works, our investment programs, or how to get support.`
    };
    setMessages([initialMessage]);
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
        const stream = await askAssistant(input);
        let assistantResponse = '';
        for await (const chunk of stream) {
            assistantResponse += chunk;
            setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage.role === 'assistant') {
                    const newMessages = [...prev.slice(0, -1)];
                    return [...newMessages, { role: 'assistant', content: assistantResponse }];
                }
                return [...prev, { role: 'assistant', content: assistantResponse }];
            });
        }
    } catch (err) {
        console.error("Error streaming response:", err);
        const errorMessage: Message = {
            role: 'assistant',
            content: "I'm sorry, but I encountered an error. Please try again or contact support if the issue persists."
        };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)]">
       <div>
            <h1 className="text-3xl font-bold tracking-tight">Virtual Assistant</h1>
            <p className="text-muted-foreground">
                Your AI-powered guide to the YieldLink platform.
            </p>
       </div>
       <Card className="flex-1 mt-6 flex flex-col">
            <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-6" ref={scrollAreaRef}>
                     <div className="space-y-6">
                        {messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'assistant' && (
                            <Avatar className="h-9 w-9 border">
                                <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                            )}
                            <div className={`max-w-xl rounded-lg p-3 text-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <ReactMarkdown
                                    components={{
                                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1" {...props} />,
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>
                            {message.role === 'user' && (
                            <Avatar className="h-9 w-9 border">
                                <AvatarImage src={user?.photoURL ?? undefined} />
                                <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                            </Avatar>
                            )}
                        </div>
                        ))}
                         {isLoading && (
                            <div className="flex items-start gap-3">
                                <Avatar className="h-9 w-9 border">
                                    <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                                <div className="bg-muted rounded-lg p-3 flex items-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <div className="border-t p-4">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <Input
                            name="prompt"
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Ask me anything about how YieldLink works..."
                            className="flex-1"
                            disabled={isLoading}
                        />
                        <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                            <Send className="h-4 w-4"/>
                        </Button>
                    </form>
                </div>
            </CardContent>
       </Card>
    </div>
  );
}
