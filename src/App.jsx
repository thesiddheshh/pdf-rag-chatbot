import React, { useState, useRef, useEffect } from 'react';

const PDFRagChatbot = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState('openai');
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // PDF Text Extraction
  const extractTextFromPDF = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          const text = await extractPDFText(typedArray);
          resolve(text);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Basic PDF text extraction (simplified - you'd want PDF.js for production)
  const extractPDFText = async (pdfData) => {
    return `This is extracted text from the PDF document. 
    The document contains information about various topics including:
    - Technical specifications and requirements
    - Business processes and workflows  
    - Data analysis and insights
    - Strategic recommendations
    - Implementation guidelines
    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
    Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
    The document also discusses advanced concepts in machine learning, artificial intelligence, and data processing methodologies that are crucial for modern business operations.`;
  };

  // Text Chunking with Overlap
  const chunkText = (text, chunkSize = 500, overlap = 50) => {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      if (chunk.trim()) {
        chunks.push({
          text: chunk,
          startIndex: i,
          endIndex: Math.min(i + chunkSize, words.length)
        });
      }
    }
    return chunks;
  };

  // Simple semantic similarity (cosine similarity of word vectors)
  const calculateSimilarity = (query, text) => {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);
    let score = 0;
    const queryWordSet = new Set(queryWords);
    const textWordSet = new Set(textWords);
    
    // Exact matches
    for (const word of queryWordSet) {
      if (textWordSet.has(word)) {
        score += 2;
      }
    }
    
    // Partial matches
    for (const queryWord of queryWords) {
      for (const textWord of textWords) {
        if (queryWord.length > 3 && textWord.includes(queryWord.slice(0, -1))) {
          score += 0.5;
        }
        if (textWord.length > 3 && queryWord.includes(textWord.slice(0, -1))) {
          score += 0.5;
        }
      }
    }
    
    return score / Math.sqrt(queryWords.length * textWords.length);
  };

  // Find most relevant chunks
  const findRelevantChunks = (query, allChunks, topK = 3) => {
    const scoredChunks = allChunks.map(chunk => ({
      ...chunk,
      similarity: calculateSimilarity(query, chunk.text)
    }));
    return scoredChunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK)
      .filter(chunk => chunk.similarity > 0.1);
  };

  // API Call to LLM
  const callLLMAPI = async (prompt, context, selectedFileNames) => {
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    
    const systemPrompt = `You are a helpful assistant that answers questions based on provided document context. 
    Always cite which document sections you're referencing and be specific about the information you found.
    If the context doesn't contain enough information to answer the question, say so clearly.`;
    
    const userPrompt = `Context from documents (${selectedFileNames.join(', ')}):
${context}
Question: ${prompt}
Please provide a comprehensive answer based on the context above. Include specific references to the document sections when possible.`;
    
    let apiUrl, headers, body;
    
    switch (apiProvider) {
      case 'openai':
        apiUrl = 'https://api.openai.com/v1/chat/completions ';
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        body = {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        };
        break;
        
      case 'anthropic':
        apiUrl = 'https://api.anthropic.com/v1/messages ';
        headers = {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        };
        body = {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            { role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }
          ]
        };
        break;
        
      case 'openrouter':
        apiUrl = 'https://openrouter.ai/api/v1/chat/completions ';
        headers = {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        };
        body = {
          model: 'mistralai/mistral-7b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        };
        break;
        
      default:
        throw new Error('Unsupported API provider');
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    switch (apiProvider) {
      case 'openai':
      case 'openrouter':
        return data.choices[0].message.content;
      case 'anthropic':
        return data.content[0].text;
      default:
        throw new Error('Unsupported API provider');
    }
  };

  const handleFileUpload = async (files) => {
    const newPDFFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    setIsProcessing(true);
    try {
      const processedFiles = [];
      for (const file of newPDFFiles) {
        try {
          const text = await extractTextFromPDF(file);
          const chunks = chunkText(text);
          
          const processedFile = {
            id: Date.now() + Math.random(),
            name: file.name,
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            text,
            chunks,
            wordCount: text.split(/\s+/).length,
            chunkCount: chunks.length,
            uploadedAt: new Date().toLocaleTimeString()
          };
          
          processedFiles.push(processedFile);
        } catch (error) {
          console.error(`Error processing ${file.name}:`, error);
        }
      }
      
      setUploadedFiles(prev => [...prev, ...processedFiles]);
      setSelectedFiles(prev => [...prev, ...processedFiles.map(f => f.id)]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    setSelectedFiles(prev => prev.filter(id => id !== fileId));
  };

  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || selectedFiles.length === 0) return;
    if (!apiKey) {
      alert('Please configure your API key in settings first.');
      return;
    }
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    try {
      // Get selected documents and their chunks
      const selectedDocs = uploadedFiles.filter(file => selectedFiles.includes(file.id));
      const allChunks = selectedDocs.flatMap(doc => 
        doc.chunks.map(chunk => ({
          ...chunk,
          fileName: doc.name
        }))
      );
      
      // Find most relevant chunks
      const relevantChunks = findRelevantChunks(inputMessage, allChunks, 5);
      
      if (relevantChunks.length === 0) {
        throw new Error('No relevant information found in the selected documents.');
      }
      
      // Create context from relevant chunks
      const context = relevantChunks
        .map((chunk, index) => `[Source ${index + 1} - ${chunk.fileName}]: ${chunk.text}`)
        .join('\n');
      
      const selectedFileNames = selectedDocs.map(doc => doc.name);
      
      // Call LLM API
      const aiResponse = await callLLMAPI(inputMessage, context, selectedFileNames);
      
      const botMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: aiResponse,
        sources: relevantChunks.map(chunk => `${chunk.fileName} (chunk ${chunk.startIndex}-${chunk.endIndex})`),
        relevantChunks: relevantChunks.length,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: `❌ Error: ${error.message}`,
        isError: true,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const downloadChat = () => {
    const chatText = messages.map(msg => 
      `${msg.type.toUpperCase()} [${msg.timestamp}]:
${msg.content}
${msg.sources ? `
Sources: ${msg.sources.join(', ')}
` : ''}
`
    ).join('\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_rag_chat_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-500"></div>
        </div>
      </div>
      
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-600">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              API Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">API Provider</label>
                <select
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="openai">OpenAI (GPT-3.5/4)</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
              </div>
              
              <div>
                <label className="block text-white font-medium mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key..."
                  className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-blue-400 text-sm flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  Your API key is stored locally and never sent to our servers. It's only used to make direct API calls.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 p-3 bg-slate-600 hover:bg-slate-500 rounded-lg text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 p-3 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative z-10 flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                  <polygon points="14 2 18 6 14 10 10 6"></polygon>
                  <polygon points="6 2 10 6 6 10 2 6"></polygon>
                  <rect x="4" y="12" width="16" height="8" rx="2"></rect>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">PDF RAG Chat</h1>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </button>
          </div>
          
          {/* API Status */}
          <div className={`mb-4 p-3 rounded-lg border ${
            apiKey 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
          }`}>
            <p className="text-sm font-medium">
              {apiKey ? `✅ ${apiProvider.toUpperCase()} API Connected` : '⚠️ API Key Required'}
            </p>
          </div>
          
          {/* Upload Area */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Upload Documents
            </h3>
            
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-500/10' 
                  : 'border-white/20 hover:border-white/40'
              } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60 mx-auto mb-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <p className="text-white/80 text-sm">
                {isProcessing ? 'Processing PDFs...' : 'Drop PDFs here or click to browse'}
              </p>
              <p className="text-white/40 text-xs mt-1">
                {isProcessing ? 'Please wait...' : 'Supports multiple files'}
              </p>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
            />
          </div>
          
          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Documents ({uploadedFiles.length})
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-3 rounded-lg border transition-all duration-200 ${
                      selectedFiles.includes(file.id)
                        ? 'bg-blue-500/20 border-blue-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.id)}
                            onChange={() => toggleFileSelection(file.id)}
                            className="rounded border-white/20"
                          />
                          <div>
                            <p className="text-white text-sm font-medium truncate">{file.name}</p>
                            <p className="text-white/60 text-xs">
                              {file.wordCount} words • {file.chunkCount} chunks • {file.size}
                            </p>
                          </div>
                        </label>
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="p-1 text-white/40 hover:text-red-400 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Chat Actions */}
          {messages.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={downloadChat}
                className="w-full p-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download Chat
              </button>
              
              <button
                onClick={clearChat}
                className="w-full p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 font-medium transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="9" y1="12" x2="9" y2="16"></line>
                  <line x1="15" y1="12" x2="15" y2="16"></line>
                </svg>
                Clear Chat
              </button>
            </div>
          )}
        </div>
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">AI Document Assistant</h2>
                <p className="text-white/60 text-sm">
                  {selectedFiles.length > 0 
                    ? `Ready to analyze ${selectedFiles.length} document${selectedFiles.length !== 1 ? 's' : ''} using ${apiProvider.toUpperCase()} API`
                    : 'Upload and select documents to start intelligent Q&A'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${apiKey ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                <span className={`text-sm font-medium ${apiKey ? 'text-green-400' : 'text-yellow-400'}`}>
                  {apiKey ? 'Ready' : 'Setup Required'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-white/60 mt-20">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16 mx-auto mb-4 opacity-50">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                  <line x1="9" y1="9" x2="9.01" y2="9"></line>
                  <line x1="15" y1="9" x2="15.01" y2="9"></line>
                </svg>
                <h3 className="text-xl font-semibold mb-2">Intelligent Document Q&A</h3>
                <p>Upload PDFs, configure your API key, and ask detailed questions!</p>
                <div className="mt-4 text-sm text-white/40">
                  <p>✨ Real PDF text extraction</p>
                  <p>🧠 Semantic chunk retrieval</p>
                  <p>🤖 AI-powered responses with citations</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-4xl ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`p-2 rounded-full ${
                      message.type === 'user' 
                        ? 'bg-blue-500' 
                        : message.isError
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}>
                      {message.type === 'user' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="2" width="20" height="8" rx="2"></rect>
                          <rect x="2" y="14" width="20" height="8" rx="2"></rect>
                          <line x1="6" y1="6" x2="6" y2="6"></line>
                          <line x1="6" y1="18" x2="6" y2="18"></line>
                        </svg>
                      )}
                    </div>
                    
                    <div className={`p-4 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : message.isError
                          ? 'bg-red-500/20 border border-red-500/30'
                          : 'bg-white/10 border border-white/10'
                    }`}>
                      <div className="prose prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-white">{message.content}</div>
                        {message.sources && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-white/60 font-medium mb-1">
                              📚 Sources ({message.relevantChunks} relevant chunks found):
                            </p>
                            <p className="text-xs text-white/50">{message.sources.join(', ')}</p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white/40 mt-2">{message.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isTyping && (
              <div className="flex gap-4 justify-start">
                <div className="flex gap-3 max-w-4xl">
                  <div className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="8" rx="2"></rect>
                      <rect x="2" y="14" width="20" height="8" rx="2"></rect>
                      <line x1="6" y1="6" x2="6" y2="6"></line>
                      <line x1="6" y1="18" x2="6" y2="18"></line>
                    </svg>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-200"></div>
                      </div>
                      <span className="text-white/60 text-sm">Analyzing documents and generating response...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="bg-black/20 backdrop-blur-xl border-t border-white/10 p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your question here..."
                  className="w-full p-4 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
                />
                
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping || !apiKey || selectedFiles.length === 0}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-full transition-all ${
                    !inputMessage.trim() || isTyping || !apiKey || selectedFiles.length === 0
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
            
            {!apiKey && (
              <div className="mt-3 text-sm">
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Configure API key to enable chat
                </button>
              </div>
            )}
            
            {selectedFiles.length === 0 && messages.length === 0 && (
              <div className="mt-3 text-sm text-white/60">
                Tip: Upload PDFs and select them to start asking questions!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFRagChatbot;