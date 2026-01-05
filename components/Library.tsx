import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Folder, 
  FileText, 
  Plus, 
  ChevronRight, 
  ArrowLeft, 
  Trash2, 
  Search,
  FolderPlus,
  FilePlus,
  Save,
  Home,
  Upload,
  Image as ImageIcon,
  Download,
  X,
  Eye,
  Loader2,
  ImagePlus,
  Paperclip
} from 'lucide-react';
import { Note, Folder as FolderType, Attachment } from '../types';
import { Card } from './Card';

interface LibraryProps {
  notes: Note[];
  folders: FolderType[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onSaveFolder: (folder: FolderType) => void;
  onDeleteFolder: (id: string) => void;
}

// UUID Generator
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const Library: React.FC<LibraryProps> = ({ 
  notes, 
  folders, 
  onSaveNote, 
  onDeleteNote, 
  onSaveFolder, 
  onDeleteFolder 
}) => {
  // Navigation State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string | null, name: string}[]>([{ id: null, name: 'Library' }]);
  
  // Editor/Viewer State
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [viewingFile, setViewingFile] = useState<Note | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Creation State
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  
  // Thumbnail State
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [editingThumbnailFor, setEditingThumbnailFor] = useState<string | null>(null);

  // Filtering
  const [searchQuery, setSearchQuery] = useState('');

  // --- DERIVED DATA ---
  const currentItems = useMemo(() => {
    if (searchQuery.trim()) {
      // If searching, flatten the hierarchy
      const q = searchQuery.toLowerCase();
      return {
        visibleFolders: folders.filter(f => f.name.toLowerCase().includes(q)),
        visibleNotes: notes.filter(n => n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q)))
      };
    }
    
    return {
      visibleFolders: folders.filter(f => f.parentId === currentFolderId),
      visibleNotes: notes.filter(n => n.folderId === currentFolderId)
    };
  }, [folders, notes, currentFolderId, searchQuery]);

  // --- BLOB URL GENERATION ---
  useEffect(() => {
    if (viewingFile && viewingFile.type === 'pdf' && viewingFile.attachment) {
        try {
            const base64Data = viewingFile.attachment.includes(',') 
                ? viewingFile.attachment.split(',')[1] 
                : viewingFile.attachment;
            
            const binaryString = window.atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);

            return () => {
                URL.revokeObjectURL(url);
            };
        } catch (e) {
            console.error("Failed to generate PDF blob", e);
            setPdfBlobUrl(null);
        }
    } else {
        setPdfBlobUrl(null);
    }
  }, [viewingFile]);

  // --- ACTIONS ---

  const handleNavigate = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    if (folderId === null) {
      setFolderPath([{ id: null, name: 'Library' }]);
    } else {
      const existingIndex = folderPath.findIndex(p => p.id === folderId);
      if (existingIndex !== -1) {
        setFolderPath(folderPath.slice(0, existingIndex + 1));
      } else {
        setFolderPath([...folderPath, { id: folderId, name: folderName }]);
      }
    }
    setSearchQuery('');
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    const newFolder: FolderType = {
      id: generateUUID(),
      name: newFolderName,
      parentId: currentFolderId,
      timestamp: Date.now()
    };
    
    onSaveFolder(newFolder);
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: generateUUID(),
      title: '',
      content: '',
      folderId: currentFolderId,
      timestamp: Date.now(),
      lastModified: Date.now(),
      type: 'text'
    };
    setActiveNote(newNote);
    setIsEditing(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Add explicit File type to ensure correct type inference for file properties.
    const file: File | undefined = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
        alert("File too large. Please upload files under 4MB.");
        return;
    }

    setIsProcessing(true);

    try {
        const type = file.type.includes('pdf') ? 'pdf' : 'image';
        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            
            const newNote: Note = {
                id: generateUUID(),
                title: file.name,
                content: '', 
                folderId: currentFolderId,
                timestamp: Date.now(),
                lastModified: Date.now(),
                type: type,
                attachment: result,
                fileName: file.name,
                thumbnail: type === 'image' ? result : undefined
            };
            onSaveNote(newNote);
            setIsProcessing(false);
        };
        reader.readAsDataURL(file);
    } catch (error) {
        console.error("Upload failed", error);
        setIsProcessing(false);
    }
    
    e.target.value = '';
  };

  const handleAttachmentAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeNote) return;

    // FIX: Iterate directly over the FileList. `Array.from(files)` was causing `file` to be of type `unknown`.
    for (const file of files) {
      if (file.size > 4 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Please attach files under 4MB.`);
        continue; // Skip this file
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const attachmentType = file.type.includes('pdf') ? 'pdf' : 'image';
        
        const newAttachment: Attachment = {
          id: generateUUID(),
          data: result,
          fileName: file.name,
          type: attachmentType,
        };

        setActiveNote(prev => {
          if (!prev) return null;
          const existingAttachments = prev.attachments || [];
          return {
            ...prev,
            attachments: [...existingAttachments, newAttachment],
          };
        });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset input
  };

  const handleAttachmentRemove = (attachmentId: string) => {
    setActiveNote(prev => {
        if (!prev || !prev.attachments) return prev;
        return {
            ...prev,
            attachments: prev.attachments.filter(att => att.id !== attachmentId),
        };
    });
  };

  const handleThumbnailUploadClick = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    setEditingThumbnailFor(noteId);
    thumbnailInputRef.current?.click();
  };

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editingThumbnailFor) return;

      if (file.size > 1 * 1024 * 1024) { // 1MB limit for thumbnails
          alert("Thumbnail image too large. Please use an image under 1MB.");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          const thumbnailData = reader.result as string;
          const noteToUpdate = notes.find(n => n.id === editingThumbnailFor);
          if (noteToUpdate) {
              onSaveNote({ ...noteToUpdate, thumbnail: thumbnailData });
          }
          setEditingThumbnailFor(null);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // Reset input
  };

  const handleDeleteFolderRecursive = (folderId: string) => {
    if (window.confirm("Delete this folder and all its contents?")) {
      onDeleteFolder(folderId);
      const childNotes = notes.filter(n => n.folderId === folderId);
      childNotes.forEach(n => onDeleteNote(n.id));
      const childFolders = folders.filter(f => f.parentId === folderId);
      childFolders.forEach(f => handleDeleteFolderRecursive(f.id));
    }
  };

  const handleViewAttachment = (attachment: Attachment) => {
    // Create a temporary note-like object for the viewer
    const tempNoteForViewer: Note = {
        id: attachment.id,
        title: attachment.fileName,
        type: attachment.type,
        attachment: attachment.data,
        fileName: attachment.fileName,
        // other fields are not needed for the viewer but need to be present for the type
        content: '',
        folderId: null,
        timestamp: Date.now(),
        lastModified: Date.now(),
    };
    setViewingFile(tempNoteForViewer);
  };

  const handleNoteClick = (note: Note) => {
      // Legacy single-file notes
      if (note.type === 'image' || note.type === 'pdf') {
          setViewingFile(note);
          return;
      }

      // Text notes (the main type now)
      if (note.type === 'text' || !note.type) {
          // CONVENIENCE SHORTCUT: If a note has no text content and only one PDF, open the PDF viewer directly.
          if (
              !note.content?.trim() && 
              note.attachments?.length === 1 && 
              note.attachments[0].type === 'pdf'
          ) {
              const attachment = note.attachments[0];
              const tempNoteForViewer: Note = {
                  id: note.id,
                  title: note.title || attachment.fileName,
                  type: 'pdf',
                  attachment: attachment.data,
                  fileName: attachment.fileName,
                  content: '',
                  folderId: note.folderId,
                  timestamp: note.timestamp,
                  lastModified: note.lastModified,
              };
              setViewingFile(tempNoteForViewer);
          } else {
              // Default behavior for text notes: open the editor.
              setActiveNote(note);
              setIsEditing(true);
          }
      }
  };

  if (isEditing && activeNote) {
    return (
      <div className="h-[calc(100vh-260px)] md:h-[calc(100vh-160px)] flex flex-col animate-in slide-in-from-right-4 duration-300">
        <input 
          type="file" 
          ref={attachmentInputRef} 
          className="hidden" 
          accept="image/*,application/pdf"
          onChange={handleAttachmentAdd}
          multiple
        />
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-white/10">
          <button 
            onClick={() => setIsEditing(false)}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="flex items-center gap-2">
             <button
              onClick={() => attachmentInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
            >
              <Paperclip size={14} /> <span className="hidden sm:inline">Attach File</span>
            </button>
             <button 
               onClick={() => {
                 onSaveNote({ ...activeNote, lastModified: Date.now() });
                 setIsEditing(false);
               }}
               className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
             >
               <Save size={14} /> <span className="hidden sm:inline">Save Note</span>
             </button>
          </div>
        </div>

        <Card className="flex-1 flex flex-col p-6 md:p-8 bg-white dark:bg-slate-900 border-none shadow-none">
           <input 
             type="text" 
             placeholder="Note Title"
             className="text-3xl font-bold bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 mb-6"
             value={activeNote.title}
             onChange={(e) => setActiveNote({...activeNote, title: e.target.value})}
             autoFocus
           />
           <textarea 
             placeholder="Start writing..."
             className="flex-1 w-full bg-transparent outline-none resize-none text-base md:text-lg leading-relaxed text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-700 custom-scrollbar"
             value={activeNote.content}
             onChange={(e) => setActiveNote({...activeNote, content: e.target.value})}
           />

           {activeNote.attachments && activeNote.attachments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Attachments ({activeNote.attachments.length})</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {activeNote.attachments.map(att => (
                    <div key={att.id} className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                      <div 
                        onClick={() => handleViewAttachment(att)}
                        className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group"
                      >
                        {att.type === 'image' ? (
                          <img src={att.data} alt="Attachment preview" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="p-2.5 bg-rose-100 dark:bg-rose-500/10 text-rose-500 rounded-lg">
                            <FileText size={16} />
                          </div>
                        )}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-indigo-500 transition-colors">{att.fileName}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleAttachmentRemove(att.id); }} className="p-1.5 text-rose-500 hover:text-rose-700 rounded-full hover:bg-rose-100 dark:hover:bg-rose-500/10 transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

           <div className="pt-4 text-[10px] text-slate-400 font-mono text-right">
              {activeNote.content.length} chars • Last edited {new Date(activeNote.lastModified).toLocaleTimeString()}
           </div>
        </Card>
      </div>
    );
  }

  return (
    <div id="library-container" className="space-y-6 pb-20 animate-in fade-in duration-500">
      <input 
          type="file" 
          ref={thumbnailInputRef}
          className="hidden" 
          accept="image/*"
          onChange={handleThumbnailFileChange}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Library</h2>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-1 font-bold">
             Your Second Brain
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:w-64 group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400 dark:text-white"
              />
           </div>
        </div>
      </div>

      {!searchQuery && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
          {folderPath.map((item, index) => (
            <div key={item.id || 'root'} className="flex items-center">
              {index > 0 && <ChevronRight size={14} className="text-slate-400 mx-1" />}
              <button 
                onClick={() => handleNavigate(item.id, item.name)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap
                  ${index === folderPath.length - 1 
                    ? 'bg-indigo-100 text-theme-accent-on-light dark:bg-indigo-500/20 dark:text-indigo-300' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'}
                `}
              >
                {item.id === null && <Home size={12} />}
                {item.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {!searchQuery && (
        <div className="flex flex-wrap gap-2 pb-2">
           {isCreatingFolder ? (
             <form onSubmit={handleCreateFolder} className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 pl-3 rounded-xl border border-indigo-500 animate-in fade-in zoom-in-95 min-w-[200px]">
                <Folder size={16} className="text-indigo-500 shrink-0" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Folder Name"
                  className="bg-transparent w-full outline-none text-sm text-slate-900 dark:text-white"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => { if(!newFolderName) setIsCreatingFolder(false); }}
                />
                <button type="submit" className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
                  <Plus size={14} />
                </button>
             </form>
           ) : (
             <button 
                onClick={() => setIsCreatingFolder(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-transparent hover:border-slate-300 dark:hover:border-white/20 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap"
             >
                <FolderPlus size={16} /> New Folder
             </button>
           )}
           
           <button 
              onClick={handleCreateNote}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap"
           >
              <FilePlus size={16} /> New Note
           </button>

           <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={`flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all active:scale-95 whitespace-nowrap ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
           >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
              {isProcessing ? 'Processing' : 'Upload'}
           </button>
           <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,application/pdf"
              onChange={handleFileUpload}
           />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {currentItems.visibleFolders.map(folder => (
           <div 
             key={folder.id}
             onClick={() => handleNavigate(folder.id, folder.name)}
             className="group relative bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 hover:border-indigo-400 dark:hover:border-indigo-500/50 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-lg active:scale-95 flex flex-col justify-between aspect-[4/3]"
           >
              <div className="flex justify-between items-start">
                 <div className="p-3 bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                    <Folder size={24} fill="currentColor" className="fill-current opacity-50" />
                 </div>
                 <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolderRecursive(folder.id); }}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                 >
                    <Trash2 size={14} />
                 </button>
              </div>
              <div>
                 <h4 className="font-bold text-slate-800 dark:text-white truncate" title={folder.name}>{folder.name}</h4>
                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">
                    {notes.filter(n => n.folderId === folder.id).length} Items
                 </p>
              </div>
           </div>
         ))}

         {currentItems.visibleNotes.map(note => (
           <div 
             key={note.id}
             onClick={() => handleNoteClick(note)}
             className="group relative bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 hover:border-indigo-400 dark:hover:border-indigo-500/50 rounded-2xl cursor-pointer transition-all hover:shadow-lg active:scale-95 flex flex-col aspect-[4/3] overflow-hidden"
           >
              {(note.type === 'image' || (note.type === 'pdf' && note.thumbnail)) ? (
                  <>
                    <div className="h-2/3 w-full bg-slate-100 dark:bg-black/20 overflow-hidden relative">
                        <img 
                            src={note.thumbnail || note.attachment} 
                            alt={note.title} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                        <div className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}>
                            <Trash2 size={12} />
                        </div>
                        {note.type === 'pdf' && (
                            <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-bold uppercase rounded tracking-wider shadow-sm">
                                PDF
                            </div>
                        )}
                    </div>
                    <div className="p-3 flex flex-col justify-center flex-1">
                        <h4 className="font-bold text-slate-800 dark:text-white truncate text-xs mb-0.5" title={note.title}>
                            {note.title}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">{note.type === 'pdf' ? 'Document' : 'Image'}</span>
                    </div>
                  </>
              ) : note.type === 'pdf' ? (
                  <div className="flex flex-col h-full p-4 justify-between">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl">
                            <FileText size={20} />
                        </div>
                        <div className="flex items-center">
                          <button 
                              onClick={(e) => handleThumbnailUploadClick(e, note.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                              title="Add preview image"
                          >
                              <ImagePlus size={14} />
                          </button>
                          <button 
                              onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                              <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white truncate text-sm mb-1" title={note.title}>
                            {note.title}
                        </h4>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">PDF Document</span>
                      </div>
                  </div>
              ) : (
                  (() => {
                    const firstImageAttachment = note.attachments?.find(att => att.type === 'image');
                    return (
                      <div className="flex flex-col h-full p-4">
                        {firstImageAttachment && (
                          <div className="h-24 -mx-4 -mt-4 mb-4 overflow-hidden border-b border-slate-100 dark:border-white/5">
                            <img src={firstImageAttachment.data} alt="Note attachment" className="w-full h-full object-cover" />
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                              <FileText size={20} />
                            </div>
                            {note.attachments && note.attachments.length > 0 && (
                              <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-400 flex items-center gap-1.5">
                                <Paperclip size={14} />
                                <span className="text-xs font-bold">{note.attachments.length}</span>
                              </div>
                            )}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
    
                        <div className="flex-1 overflow-hidden mt-2">
                          <h4 className="font-bold text-slate-800 dark:text-white truncate text-sm mb-1" title={note.title || 'Untitled'}>
                            {note.title || 'Untitled Note'}
                          </h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {note.content || 'No content...'}
                          </p>
                        </div>
    
                        <p className="text-[9px] text-slate-400 font-mono mt-auto pt-2 border-t border-slate-100 dark:border-white/5">
                          {new Date(note.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })()
              )}
           </div>
         ))}

         {currentItems.visibleFolders.length === 0 && currentItems.visibleNotes.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-full mb-3">
                    <FolderPlus size={32} className="opacity-50" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                    {searchQuery ? 'No results found' : 'This folder is empty'}
                </p>
                {!searchQuery && <p className="text-[10px] opacity-50 mt-1">Create a folder, note or upload a file</p>}
            </div>
         )}
      </div>

      {viewingFile && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-[#0f172a] w-full max-w-4xl h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
                  <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-white dark:bg-[#0f172a]">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg text-indigo-600 dark:text-indigo-400">
                              {viewingFile.type === 'pdf' ? <FileText size={20} /> : <ImageIcon size={20} />}
                          </div>
                          <div>
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{viewingFile.title}</h3>
                              <p className="text-[10px] text-slate-500 font-mono uppercase">
                                  {new Date(viewingFile.timestamp).toLocaleDateString()}
                              </p>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <a 
                            href={viewingFile.attachment} 
                            download={viewingFile.fileName || "download"}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Download"
                          >
                              <Download size={20} />
                          </a>
                          <button 
                            onClick={() => setViewingFile(null)}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
                          >
                              <X size={20} />
                          </button>
                      </div>
                  </div>
                  <div className="flex-1 bg-slate-100 dark:bg-black/50 overflow-auto flex items-center justify-center p-4 relative">
                      {viewingFile.type === 'image' ? (
                          <img 
                            src={viewingFile.attachment} 
                            alt={viewingFile.title} 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                          />
                      ) : (
                          <div className="w-full h-full flex flex-col">
                              {pdfBlobUrl ? (
                                  <iframe 
                                      src={pdfBlobUrl} 
                                      className="w-full flex-1 rounded-lg shadow-lg border-0 bg-white"
                                      title={viewingFile.title}
                                  />
                              ) : (
                                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                      <Loader2 size={32} className="animate-spin mb-2" />
                                      <p className="text-xs uppercase font-bold">Loading PDF...</p>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}
    </div>
  );
};