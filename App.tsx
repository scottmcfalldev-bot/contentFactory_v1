import React, { useState, useRef, useEffect } from 'react';
import { generatePodcastAssets, createChatSession } from './services/geminiService';
import { PodcastAssets, ProcessingStatus, TimestampItem, SocialHook, CarouselSlide, ChatMessage } from './types';
import { AssetCard } from './components/AssetCard';
import { ChatSession } from '@google/genai';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [assets, setAssets] = useState<PodcastAssets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'audio' | 'youtube' | 'growth'>('audio');
  
  // Chat State
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Transcript Modal State
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);

  // File Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // block: "nearest" prevents the whole page from jumping if the chat is already in view
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chatHistory, isChatSending]);

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      setError("Please paste a transcript first.");
      return;
    }

    // Reset state
    setError(null);
    setAssets(null);
    setChatHistory([]);
    setActiveTab('audio');

    try {
      setStatus(ProcessingStatus.ANALYZING);
      await new Promise(r => setTimeout(r, 800));

      setStatus(ProcessingStatus.GENERATING);
      const generatedAssets = await generatePodcastAssets(transcript);
      
      // Initialize Chat
      const session = createChatSession(transcript);
      setChatSession(session);

      setAssets(generatedAssets);
      setStatus(ProcessingStatus.COMPLETE);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during processing.");
      setStatus(ProcessingStatus.ERROR);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !chatSession) return;
    
    const userMsg = chatInput;
    setChatInput('');
    setIsChatSending(true);
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);

    // Keep focus on input
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }

    try {
      const result = await chatSession.sendMessage({ message: userMsg });
      setChatHistory(prev => [...prev, { role: 'model', text: result.text || "I couldn't generate a response." }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Error sending message. Please try again." }]);
    } finally {
      setIsChatSending(false);
      // Ensure focus remains after response comes back
      if (chatInputRef.current) {
        chatInputRef.current.focus();
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic size check (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size too large. Please upload a file smaller than 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setTranscript(content);
        setError(null);
      }
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(file);
    // Reset value to allow re-uploading the same file if needed
    event.target.value = '';
  };

  const handleCopyDossier = () => {
    if (!assets) return;
    
    const dossier = `
# PROJECT DOSSIER: ${assets.episodeTitles[0]}

## 1. TITLES
${assets.episodeTitles.map(t => `- ${t}`).join('\n')}

## 2. HOOK
${assets.hook}

## 3. PLATFORM SHOW NOTES (Apple/Spotify)
${assets.showNotes}

## 4. BLOG POST (SEO)
${assets.blogPost}

## 5. TIMESTAMPS
${assets.timestamps.map(t => `${t.time} - ${t.topic}`).join('\n')}

## 6. YOUTUBE TITLES
${assets.youtube.titles.map(t => `- ${t}`).join('\n')}

## 7. YOUTUBE DESCRIPTION
${assets.youtube.description}

## 8. YOUTUBE SHORTS
${assets.youtube.shorts.map(s => `[${s.timestamp}] ${s.hook} (Score: ${s.score})`).join('\n')}

## 9. NEWSLETTER
${assets.newsletterDraft}

## 10. LINKEDIN CAROUSEL
${assets.linkedinCarousel.map(s => `Slide ${s.slideNumber}: ${s.title} - ${s.content}`).join('\n')}

## 11. SOCIAL HOOKS
${assets.socialHooks.map(s => `[${s.platform}] ${s.content}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(dossier);
    alert("Full Project Dossier copied to clipboard!");
  };

  const renderContent = () => {
    if (status === ProcessingStatus.IDLE || status === ProcessingStatus.ERROR) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
          <div className="w-full max-w-4xl p-8 flex flex-col h-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Initialize "Lazarus" Protocol</h3>
              <p className="text-slate-400 mb-0 max-w-md mx-auto">
                Paste the raw transcript (SRT preferred for timestamps) below. The engine will autonomously generate your Health & Wellness marketing assets.
              </p>
            </div>
            
            <div className="flex-grow flex flex-col gap-4">
              <div className="flex justify-end">
                  <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".txt,.srt,.vtt,.md,.csv,text/*"
                    />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-2 transition-colors"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      Upload Transcript File (.srt/.txt)
                  </button>
              </div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste transcript text here... [00:00:15] Speaker 1: Hello and welcome..."
                className="w-full h-64 md:h-80 bg-slate-900/80 border border-slate-700 rounded-lg p-4 text-slate-300 font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
              />
              
              <button 
                onClick={handleGenerate}
                disabled={!transcript.trim()}
                className="w-full md:w-auto md:self-end bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-8 rounded-lg shadow-lg shadow-emerald-900/20 transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <span>Execute Sequence</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (status !== ProcessingStatus.COMPLETE && status !== ProcessingStatus.IDLE && status !== ProcessingStatus.ERROR) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 animate-pulse">
            {status === ProcessingStatus.ANALYZING && "Parsing Transcript..."}
            {status === ProcessingStatus.GENERATING && "Constructing Assets..."}
          </h2>
          <p className="text-slate-400 font-mono text-sm">Processing text stream...</p>
        </div>
      );
    }

    if (assets) {
      return (
        <div className="animate-fade-in-up relative">
          {/* Transcript Modal */}
          {isTranscriptModalOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
                 <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
                   <h3 className="font-bold text-white flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-emerald-400">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                     </svg>
                     Source Transcript
                   </h3>
                   <button onClick={() => setIsTranscriptModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                     </svg>
                   </button>
                 </div>
                 <div className="flex-1 overflow-auto p-6 bg-slate-900">
                   <pre className="whitespace-pre-wrap text-slate-300 font-mono text-sm leading-relaxed">{transcript}</pre>
                 </div>
                 <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-xl text-right">
                   <button 
                     onClick={() => setIsTranscriptModalOpen(false)}
                     className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
                   >
                     Close Viewer
                   </button>
                 </div>
              </div>
            </div>
          )}

          {/* Header Area: Chat Interface & Actions */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl mb-8 flex flex-col md:flex-row">
             {/* Left: Status & Actions */}
             <div className="p-6 md:p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800/50 flex flex-col justify-between">
                <div>
                   <span className="px-3 py-1 bg-emerald-900/50 text-emerald-400 border border-emerald-800 rounded text-xs font-mono uppercase tracking-widest inline-block mb-4">
                     Analysis Complete
                   </span>
                   <h2 className="text-xl font-bold text-white tracking-tight mb-2">Command Center</h2>
                   <p className="text-slate-400 text-sm mb-6">Review your assets below. Use the chat to refine content or ask questions about the episode.</p>
                   
                   <button 
                     onClick={() => setIsTranscriptModalOpen(true)}
                     className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                       <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                     </svg>
                     View Source Transcript
                   </button>
                </div>
                <div className="mt-8 flex flex-col gap-3">
                    <button 
                      onClick={handleCopyDossier}
                      className="w-full bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-4 rounded transition-colors flex items-center justify-center gap-2 group"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:scale-110 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                      </svg>
                      Copy Full Dossier
                    </button>
                </div>
             </div>

             {/* Right: Live Chat */}
             <div className="flex-1 flex flex-col h-[400px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                   {chatHistory.length === 0 && (
                     <div className="text-center text-slate-500 mt-12">
                       <p className="mb-2">Ready to assist.</p>
                       <p className="text-sm">"Write 3 more viral hooks"</p>
                       <p className="text-sm">"What was the guest's main argument about sugar?"</p>
                     </div>
                   )}
                   {chatHistory.map((msg, i) => (
                     <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                         msg.role === 'user' 
                           ? 'bg-emerald-600 text-white rounded-br-none' 
                           : 'bg-slate-700 text-slate-200 rounded-bl-none'
                       }`}>
                         {msg.text}
                       </div>
                     </div>
                   ))}
                   
                   {/* Typing Indicator */}
                   {isChatSending && (
                     <div className="flex justify-start animate-fade-in-up">
                        <div className="bg-slate-700 text-slate-200 rounded-lg rounded-bl-none p-3 text-sm flex items-center gap-1.5 min-w-[3rem] justify-center">
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                        </div>
                     </div>
                   )}
                   <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-800/30">
                   <div className="flex gap-2">
                     <input 
                       ref={chatInputRef}
                       type="text" 
                       value={chatInput}
                       onChange={(e) => setChatInput(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                       placeholder="Ask me anything about this content here..."
                       className="flex-1 bg-slate-900 border border-slate-600 rounded px-4 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                     />
                     <button 
                       onClick={handleSendMessage}
                       disabled={isChatSending || !chatInput.trim()}
                       className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white p-2 rounded transition-colors"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                         <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                       </svg>
                     </button>
                   </div>
                </div>
             </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700 mb-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('audio')}
              className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'audio' 
                  ? 'text-emerald-400 border-b-2 border-emerald-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Audio & Web
            </button>
            <button
              onClick={() => setActiveTab('youtube')}
              className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'youtube' 
                  ? 'text-red-400 border-b-2 border-red-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              YouTube Studio
            </button>
            <button
              onClick={() => setActiveTab('growth')}
              className={`px-6 py-3 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'growth' 
                  ? 'text-blue-400 border-b-2 border-blue-400' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Growth & Email
            </button>
          </div>

          {/* Tab Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* TAB: AUDIO & WEB */}
            {activeTab === 'audio' && (
              <>
                <div className="space-y-8">
                  <div className="mb-6 p-6 bg-slate-900/50 rounded-lg border-l-4 border-emerald-500">
                    <h4 className="text-emerald-400 font-mono text-xs uppercase tracking-widest mb-2">The Cold Open Hook</h4>
                    <p className="text-slate-200 italic text-lg">"{assets.hook}"</p>
                  </div>

                  <AssetCard
                    title="Platform Show Notes (Apple/Spotify)"
                    type="markdown"
                    copyValue={assets.showNotes}
                    content={assets.showNotes}
                  />
                  
                  <AssetCard
                    title="Timestamps"
                    type="custom"
                    copyValue={assets.timestamps.map(t => `${t.time} - ${t.topic}`).join('\n')}
                    content={
                      assets.timestamps.length > 0 ? (
                        <ul className="space-y-3">
                          {assets.timestamps.map((item: TimestampItem, idx: number) => (
                            <li key={idx} className="flex gap-4 items-baseline border-b border-slate-700/50 pb-2 last:border-0">
                              <span className="font-mono text-emerald-400 font-bold shrink-0">{item.time}</span>
                              <span className="text-slate-300">{item.topic}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-slate-500 italic text-sm">
                          No valid timestamps found in source text. To generate timestamps, please provide an SRT file or text with [00:00] format codes.
                        </div>
                      )
                    }
                  />
                </div>
                <div className="space-y-8">
                  <AssetCard
                    title="Episode Title Options"
                    type="custom"
                    copyValue={assets.episodeTitles.join('\n')}
                    content={
                       <ul className="space-y-3">
                        {assets.episodeTitles.map((t, i) => (
                          <li key={i} className="flex gap-3 text-slate-200">
                            <span className="text-emerald-500/50 font-bold">{i+1}.</span>
                            <span className="font-medium">{t}</span>
                          </li>
                        ))}
                      </ul>
                    }
                  />
                  
                  <AssetCard
                    title="SEO Blog Post"
                    type="markdown"
                    copyValue={assets.blogPost}
                    content={assets.blogPost}
                  />
                </div>
              </>
            )}

            {/* TAB: YOUTUBE STUDIO */}
            {activeTab === 'youtube' && (
              <>
                 <div className="space-y-8">
                    <AssetCard
                      title="Viral YouTube Titles"
                      type="custom"
                      copyValue={assets.youtube.titles.join('\n')}
                      content={
                        <ul className="space-y-3">
                           {assets.youtube.titles.map((t, i) => (
                             <li key={i} className="flex gap-3 text-slate-200">
                               <span className="text-red-400 font-bold">{i+1}.</span>
                               <span>{t}</span>
                             </li>
                           ))}
                        </ul>
                      }
                    />
                    
                    <AssetCard
                      title="Thumbnail Text Ideas"
                      type="custom"
                      copyValue={assets.youtube.thumbnailText.join('\n')}
                      content={
                         <div className="flex flex-wrap gap-2">
                            {assets.youtube.thumbnailText.map((t, i) => (
                              <span key={i} className="bg-red-900/30 border border-red-500/30 text-red-200 px-3 py-1 rounded text-lg font-bold uppercase">
                                {t}
                              </span>
                            ))}
                         </div>
                      }
                    />

                    <AssetCard
                      title="Description First-Fold"
                      type="text"
                      copyValue={assets.youtube.description}
                      content={assets.youtube.description}
                    />
                 </div>
                 
                 <div className="space-y-8">
                    <AssetCard
                      title="Shorts Opportunities"
                      type="custom"
                      copyValue={assets.youtube.shorts.map(s => `${s.timestamp} - ${s.hook}`).join('\n')}
                      content={
                        <div className="space-y-4">
                           {assets.youtube.shorts.map((s, i) => (
                             <div key={i} className="bg-slate-900 p-4 rounded border border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-red-400 font-mono font-bold">{s.timestamp}</span>
                                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Viral Score: {s.score}/10</span>
                                </div>
                                <p className="text-slate-200 font-medium">{s.hook}</p>
                             </div>
                           ))}
                        </div>
                      }
                    />
                    
                    <AssetCard
                      title="Tags"
                      type="custom"
                      copyValue={assets.youtube.tags.join(', ')}
                      content={
                        <div className="flex flex-wrap gap-2">
                           {assets.youtube.tags.map((t, i) => (
                             <span key={i} className="bg-slate-800 text-slate-400 text-xs px-2 py-1 rounded">#{t}</span>
                           ))}
                        </div>
                      }
                    />
                 </div>
              </>
            )}

            {/* TAB: GROWTH & EMAIL */}
            {activeTab === 'growth' && (
              <>
                <div className="space-y-8">
                  <AssetCard
                    title="Newsletter Draft"
                    type="markdown"
                    copyValue={assets.newsletterDraft}
                    content={assets.newsletterDraft}
                  />
                  
                  <AssetCard
                    title="Guest Swipe Email"
                    type="markdown"
                    copyValue={assets.guestSwipeEmail}
                    content={
                      <div>
                        <p className="text-slate-400 text-sm mb-4 italic">Send this to your guest to make it easy for them to share the episode.</p>
                        <div className="whitespace-pre-wrap">{assets.guestSwipeEmail}</div>
                      </div>
                    }
                  />
                </div>
                
                <div className="space-y-8">
                  <AssetCard
                    title="Viral Quotes"
                    type="custom"
                    copyValue={assets.viralQuotes.join('\n\n')}
                    content={
                       <div className="space-y-4">
                        {assets.viralQuotes.map((quote: string, idx: number) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded border border-slate-700 relative group">
                            <span className="absolute top-2 left-2 text-4xl text-slate-800 font-serif leading-none">"</span>
                            <p className="text-slate-200 relative z-10 pl-4">{quote}</p>
                          </div>
                        ))}
                      </div>
                    }
                  />

                  <AssetCard
                    title="LinkedIn Carousel Script"
                    type="custom"
                    copyValue={assets.linkedinCarousel.map(s => `Slide ${s.slideNumber}: ${s.title}\n${s.content}`).join('\n\n')}
                    content={
                      <div className="space-y-4">
                        {assets.linkedinCarousel.map((slide: CarouselSlide, idx: number) => (
                          <div key={idx} className="bg-white text-slate-900 p-4 rounded border border-slate-300">
                            <div className="flex justify-between items-center mb-2 border-b border-slate-200 pb-2">
                               <span className="font-bold text-xs uppercase tracking-wider text-slate-500">Slide {slide.slideNumber}</span>
                            </div>
                            <h4 className="font-bold text-lg mb-1">{slide.title}</h4>
                            <p className="text-sm text-slate-700">{slide.content}</p>
                          </div>
                        ))}
                      </div>
                    }
                  />

                  <AssetCard
                    title="Social Hooks"
                    type="custom"
                    copyValue={assets.socialHooks.map(s => `[${s.platform}] ${s.content}`).join('\n\n')}
                    content={
                      <div className="space-y-4">
                        {assets.socialHooks.map((hook: SocialHook, idx: number) => (
                          <div key={idx} className="bg-slate-900 p-4 rounded border border-slate-700">
                            <div className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-mono">{hook.platform}</div>
                            <p className="text-slate-200">{hook.content}</p>
                          </div>
                        ))}
                      </div>
                    }
                  />
                </div>
              </>
            )}
            
          </div>
          
          <div className="flex justify-center pt-8 pb-12">
            <button 
              onClick={() => {
                setStatus(ProcessingStatus.IDLE);
                setAssets(null);
                setTranscript('');
                setActiveTab('audio');
                setChatSession(null);
                setChatHistory([]);
              }}
              className="text-slate-500 hover:text-white transition-colors border-b border-transparent hover:border-emerald-500 pb-1"
            >
              Start New Project
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation / Brand */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-600 rounded flex items-center justify-center font-bold text-white">
                CF
              </div>
              <span className="font-bold text-lg tracking-tight">The Content Factory</span>
            </div>
            <div className="flex items-center space-x-4">
               <span className="text-xs font-mono text-slate-500 hidden sm:inline-block">Status: Phase 1 (Lazarus)</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-200">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 shrink-0">
                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
              </svg>
             <span>{error}</span>
          </div>
        )}
        
        {renderContent()}
      </main>
    </div>
  );
};

export default App;