import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { db } from "./firebase.js";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
         doc, setDoc, getDoc, limit as fsLimit } from "firebase/firestore";
/* ── Inline SVG Icons ────────────────────────────────────────────── */
const IcHash = ({size=14,...p})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>;
const IcPaperclip = ({size=14,...p})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
const IcSend = ({size=14,...p})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IcX = ({size=14,...p})=><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

/* ── Helpers ─────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  "#e43531","#2563eb","#16a34a","#d97706","#7c3aed",
  "#db2777","#0891b2","#ea580c","#4f46e5","#059669",
];
function hashStr(s) { let h=0; for(let i=0;i<s.length;i++) h=((h<<5)-h)+s.charCodeAt(i); return Math.abs(h); }
function avatarColor(name) { return AVATAR_COLORS[hashStr(name||"?") % AVATAR_COLORS.length]; }
function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0]+parts[parts.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}
function fmtTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  if (diff < 604800000) return d.toLocaleDateString([],{weekday:"short"}) + " " + d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
  return d.toLocaleDateString([],{month:"short",day:"numeric"}) + " " + d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
}
function sameGroup(a,b) {
  if (!a || !b || a.authorId !== b.authorId) return false;
  const ta = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp||0);
  const tb = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp||0);
  return Math.abs(tb - ta) < 300000; // 5 minutes
}
function renderMentions(text, staff) {
  if (!text) return text;
  const nameSet = new Set((staff||[]).map(s=>`${s.firstName||""} ${s.lastName||""}`.trim()).filter(Boolean));
  const parts = [];
  let remaining = text;
  const mentionRe = /@([\w][\w ]{0,30}[\w])/g;
  let match, lastIdx = 0;
  mentionRe.lastIndex = 0;
  while ((match = mentionRe.exec(text)) !== null) {
    if (nameSet.has(match[1])) {
      if (match.index > lastIdx) parts.push(text.slice(lastIdx, match.index));
      parts.push(<span key={match.index} style={{background:"var(--acc-lo)",color:"var(--acc)",borderRadius:4,padding:"0 4px"}}>{match[0]}</span>);
      lastIdx = match.index + match[0].length;
    }
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts.length ? parts : text;
}

/* ── CSS injected once ───────────────────────────────────────────── */
const COMMS_CSS = `
.comms-wrap{display:flex;height:100%;overflow:hidden;background:var(--s1);}
.comms-sidebar{width:260px;min-width:260px;border-right:1px solid var(--br);display:flex;flex-direction:column;background:var(--s2);overflow:hidden;}
.comms-sidebar-hdr{padding:14px 16px 10px;font-size:15px;font-weight:700;color:var(--t1);border-bottom:1px solid var(--br);}
.comms-sidebar-scroll{flex:1;overflow-y:auto;padding:6px 0;}
.comms-section-hdr{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--t3);padding:12px 16px 4px;font-family:var(--mono);}
.comms-ch{display:flex;align-items:center;gap:8px;padding:6px 16px;cursor:pointer;font-size:12px;color:var(--t2);border-radius:6px;margin:1px 8px;transition:background .12s;}
.comms-ch:hover{background:var(--br-hi);}
.comms-ch.active{background:var(--acc-lo);color:var(--acc);font-weight:600;}
.comms-ch-dot{width:7px;height:7px;border-radius:50%;background:var(--acc);flex-shrink:0;margin-left:auto;}
.comms-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;}
.comms-main-hdr{padding:12px 18px;border-bottom:1px solid var(--br);background:var(--s2);}
.comms-main-hdr-name{font-size:14px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:6px;}
.comms-main-hdr-desc{font-size:10px;color:var(--t3);margin-top:2px;}
.comms-msgs{flex:1;overflow-y:auto;padding:12px 18px;}
.comms-msg{display:flex;gap:10px;padding:4px 0;}
.comms-msg.grouped{padding:1px 0 1px 42px;}
.comms-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;}
.comms-msg-body{flex:1;min-width:0;}
.comms-msg-author{font-size:12px;font-weight:600;color:var(--t1);}
.comms-msg-time{font-size:10px;color:var(--t3);margin-left:6px;font-weight:400;}
.comms-msg-text{font-size:12px;color:var(--t2);line-height:1.55;margin-top:1px;word-break:break-word;}
.comms-msg-photo{max-width:200px;border-radius:8px;margin-top:6px;cursor:pointer;}
.comms-input-bar{background:var(--s3);border-top:1px solid var(--br);padding:10px 14px;display:flex;align-items:flex-end;gap:8px;}
.comms-input-bar textarea{flex:1;resize:none;min-height:20px;max-height:120px;line-height:1.45;font-size:12px;}
.comms-preview{display:flex;align-items:center;gap:6px;padding:6px 14px;background:var(--s3);border-top:1px solid var(--br);}
.comms-preview img{width:48px;height:48px;object-fit:cover;border-radius:6px;}
.comms-readonly{padding:14px;text-align:center;font-size:11px;color:var(--t3);background:var(--s3);border-top:1px solid var(--br);}
.comms-mention-dd{position:absolute;bottom:100%;left:0;background:var(--s4);border:1px solid var(--br);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);max-height:160px;overflow-y:auto;z-index:50;min-width:180px;}
.comms-mention-dd-item{padding:6px 12px;font-size:12px;color:var(--t1);cursor:pointer;}
.comms-mention-dd-item:hover,.comms-mention-dd-item.active{background:var(--acc-lo);color:var(--acc);}
.comms-empty{display:flex;align-items:center;justify-content:center;flex:1;color:var(--t3);font-size:12px;}
`;

/* ── Component ───────────────────────────────────────────────────── */
export default function JobDoxComms({ companyId, currentUser, staff=[], projects=[], initialProjectId }) {
  // Inject styles once
  useEffect(()=>{
    if (document.getElementById("jd-comms-css")) return;
    const el = document.createElement("style"); el.id="jd-comms-css"; el.textContent=COMMS_CSS;
    document.head.appendChild(el);
    return ()=>{ try{document.head.removeChild(document.getElementById("jd-comms-css"));}catch(_){} };
  },[]);

  const FIXED_CHANNELS = useMemo(()=>[
    {id:"general",       name:"#general",       desc:"Company-wide · everyone can post", type:"company"},
    {id:"announcements", name:"#announcements", desc:"Company-wide · admin-only posts",  type:"company"},
    {id:"dispatch",      name:"#dispatch",      desc:"Company-wide · dispatch updates",  type:"company"},
  ],[]);

  const projectChannels = useMemo(()=>
    (projects||[]).map(p=>({id:p.id, name:p.name||p.address||p.id, desc:p.address||"", type:"project"}))
  ,[projects]);

  const singleProject = !!initialProjectId;
  const [activeChannel, setActiveChannel] = useState(()=>{
    if (initialProjectId) return {id:initialProjectId, type:"project"};
    return {id:"general", type:"company"};
  });

  // Unread tracking
  const [unread, setUnread] = useState({});

  // Messages
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(null); // {file, preview}
  const [mentionQuery, setMentionQuery] = useState(null); // null or string
  const [mentionIdx, setMentionIdx] = useState(0);
  const msgsEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const msgsContainerRef = useRef(null);

  // Staff name lookup
  const staffNames = useMemo(()=>
    (staff||[]).map(s=>({id:s.id, name:`${s.firstName||""} ${s.lastName||""}`.trim()||s.name||"Staff", permissionLevel:s.permission||s.permissionLevel||1}))
  ,[staff]);

  const mentionMatches = useMemo(()=>{
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return staffNames.filter(s=>s.name.toLowerCase().includes(q)).slice(0,8);
  },[mentionQuery, staffNames]);

  // Resolve channel info
  const channelInfo = useMemo(()=>{
    if (activeChannel.type === "company") return FIXED_CHANNELS.find(c=>c.id===activeChannel.id) || FIXED_CHANNELS[0];
    const proj = projectChannels.find(c=>c.id===activeChannel.id);
    return proj || {id:activeChannel.id, name:"Project Chat", desc:"", type:"project"};
  },[activeChannel, FIXED_CHANNELS, projectChannels]);

  // Firestore path helpers
  const getMsgPath = useCallback((ch)=>{
    if (ch.type === "company") return `companies/${companyId}/channels/${ch.id}/messages`;
    return `companies/${companyId}/projects/${ch.id}/chat`;
  },[companyId]);

  const getReaderPath = useCallback((ch)=>{
    if (ch.type === "company") return `companies/${companyId}/channels/${ch.id}/readers/${currentUser.id}`;
    return `companies/${companyId}/projects/${ch.id}/chatReaders/${currentUser.id}`;
  },[companyId, currentUser.id]);

  // Listen to active channel messages
  useEffect(()=>{
    if (!companyId || !activeChannel.id) return;
    const msgPath = getMsgPath(activeChannel);
    const q = query(collection(db, msgPath), orderBy("timestamp","asc"), fsLimit(100));
    const unsub = onSnapshot(q, snap=>{
      const msgs = snap.docs.map(d=>({id:d.id,...d.data()}));
      setMessages(msgs);
    }, err=>{ console.error("Comms listener error:",err); });
    // Mark as read
    const readerDoc = getReaderPath(activeChannel);
    setDoc(doc(db, readerDoc), {lastRead: serverTimestamp()}, {merge:true}).catch(()=>{});
    return unsub;
  },[companyId, activeChannel, getMsgPath, getReaderPath]);

  // Auto-scroll on new messages
  useEffect(()=>{
    if (msgsEndRef.current) msgsEndRef.current.scrollIntoView({behavior:"smooth"});
  },[messages]);

  // Unread tracking: listen to latest message timestamp for non-active channels
  useEffect(()=>{
    if (!companyId || !currentUser.id) return;
    const unsubs = [];
    const allChannels = [...FIXED_CHANNELS.map(c=>({id:c.id,type:"company"})), ...projectChannels.map(c=>({id:c.id,type:"project"}))];
    for (const ch of allChannels) {
      if (ch.id === activeChannel.id && ch.type === activeChannel.type) continue;
      const msgPath = getMsgPath(ch);
      const q = query(collection(db, msgPath), orderBy("timestamp","desc"), fsLimit(1));
      unsubs.push(onSnapshot(q, async snap=>{
        if (snap.empty) { setUnread(u=>({...u,[`${ch.type}_${ch.id}`]:false})); return; }
        const lastMsg = snap.docs[0].data();
        const readerPath = getReaderPath(ch);
        try {
          const readerSnap = await getDoc(doc(db, readerPath));
          if (!readerSnap.exists()) { setUnread(u=>({...u,[`${ch.type}_${ch.id}`]:true})); return; }
          const lastRead = readerSnap.data().lastRead;
          if (!lastRead || !lastMsg.timestamp) { setUnread(u=>({...u,[`${ch.type}_${ch.id}`]:true})); return; }
          const lr = lastRead.toDate ? lastRead.toDate() : new Date(lastRead);
          const lt = lastMsg.timestamp.toDate ? lastMsg.timestamp.toDate() : new Date(lastMsg.timestamp);
          setUnread(u=>({...u,[`${ch.type}_${ch.id}`]: lt > lr}));
        } catch { setUnread(u=>({...u,[`${ch.type}_${ch.id}`]:false})); }
      }, ()=>{}));
    }
    return ()=>unsubs.forEach(u=>u());
  },[companyId, currentUser.id, activeChannel, FIXED_CHANNELS, projectChannels, getMsgPath, getReaderPath]);

  // Send message
  const handleSend = useCallback(async()=>{
    const trimmed = text.trim();
    if (!trimmed && !photo) return;
    const mentionIds = [];
    if (trimmed) {
      const mentionRe = /@([\w][\w ]{0,30}[\w])/g;
      let m;
      while ((m = mentionRe.exec(trimmed)) !== null) {
        const match = staffNames.find(s=>s.name === m[1]);
        if (match) mentionIds.push(match.id);
      }
    }
    const msgDoc = {
      text: trimmed,
      authorName: currentUser.name,
      authorId: currentUser.id,
      timestamp: serverTimestamp(),
      mentions: mentionIds,
    };
    if (photo) {
      msgDoc.photoBase64 = photo.preview;
    }
    try {
      const msgPath = getMsgPath(activeChannel);
      await addDoc(collection(db, msgPath), msgDoc);
      setText("");
      setPhoto(null);
      setMentionQuery(null);
      // Update lastRead
      const readerDoc = getReaderPath(activeChannel);
      setDoc(doc(db, readerDoc), {lastRead: serverTimestamp()}, {merge:true}).catch(()=>{});
    } catch(e) { console.error("Failed to send message:",e); }
  },[text, photo, currentUser, activeChannel, staffNames, getMsgPath, getReaderPath]);

  // File picker
  const handleFileSelect = (e)=>{
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ()=>setPhoto({file, preview:reader.result});
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Input key handling
  const handleKeyDown = (e)=>{
    if (mentionQuery !== null && mentionMatches.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIdx(i=>(i+1)%mentionMatches.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIdx(i=>(i-1+mentionMatches.length)%mentionMatches.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionMatches[mentionIdx]); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e)=>{
    const val = e.target.value;
    setText(val);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    // Mention detection
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const atMatch = before.match(/@([\w ]*)$/);
    if (atMatch) { setMentionQuery(atMatch[1]); setMentionIdx(0); }
    else setMentionQuery(null);
  };

  const insertMention = (staffMember)=>{
    const cursor = inputRef.current?.selectionStart || text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const atIdx = before.lastIndexOf("@");
    const newText = before.slice(0, atIdx) + `@${staffMember.name} ` + after;
    setText(newText);
    setMentionQuery(null);
    setTimeout(()=>inputRef.current?.focus(),0);
  };

  const switchChannel = (ch)=>{
    setActiveChannel({id:ch.id, type:ch.type});
    setMessages([]);
    // Clear unread for this channel
    setUnread(u=>({...u,[`${ch.type}_${ch.id}`]:false}));
  };

  const isAnnouncements = activeChannel.id === "announcements" && activeChannel.type === "company";
  const canPost = !isAnnouncements || (currentUser.permissionLevel >= 8);

  return (
    <div className="comms-wrap" style={singleProject ? {height:"100%"} : {}}>
      {/* ── Sidebar ── */}
      {!singleProject && (
        <div className="comms-sidebar">
          <div className="comms-sidebar-hdr">Comms</div>
          <div className="comms-sidebar-scroll">
            <div className="comms-section-hdr">COMPANY</div>
            {FIXED_CHANNELS.map(ch=>(
              <div key={ch.id}
                className={`comms-ch${activeChannel.id===ch.id && activeChannel.type==="company"?" active":""}`}
                onClick={()=>switchChannel(ch)}>
                <IcHash size={13} style={{opacity:.6,flexShrink:0}}/> {ch.name.replace("#","")}
                {unread[`company_${ch.id}`] && <span className="comms-ch-dot"/>}
              </div>
            ))}
            <div className="comms-section-hdr">PROJECTS</div>
            {projectChannels.map(ch=>(
              <div key={ch.id}
                className={`comms-ch${activeChannel.id===ch.id && activeChannel.type==="project"?" active":""}`}
                onClick={()=>switchChannel(ch)}>
                <IcHash size={13} style={{opacity:.6,flexShrink:0}}/>
                <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ch.name}</span>
                {unread[`project_${ch.id}`] && <span className="comms-ch-dot"/>}
              </div>
            ))}
            {projectChannels.length === 0 && (
              <div style={{padding:"8px 16px",fontSize:11,color:"var(--t3)"}}>No projects yet</div>
            )}
          </div>
        </div>
      )}

      {/* ── Main chat area ── */}
      <div className="comms-main">
        <div className="comms-main-hdr">
          <div className="comms-main-hdr-name">
            <IcHash size={14}/> {channelInfo.type === "company" ? channelInfo.name.replace("#","") : channelInfo.name}
          </div>
          <div className="comms-main-hdr-desc">{channelInfo.desc}</div>
        </div>

        <div className="comms-msgs" ref={msgsContainerRef}>
          {messages.length === 0 && (
            <div className="comms-empty">No messages yet. Start the conversation!</div>
          )}
          {messages.map((msg, i)=>{
            const prev = i > 0 ? messages[i-1] : null;
            const grouped = sameGroup(prev, msg);
            return (
              <div key={msg.id} className={`comms-msg${grouped?" grouped":""}`}>
                {!grouped && (
                  <div className="comms-av" style={{background:avatarColor(msg.authorName)}}>
                    {initials(msg.authorName)}
                  </div>
                )}
                <div className="comms-msg-body">
                  {!grouped && (
                    <div>
                      <span className="comms-msg-author">{msg.authorName}</span>
                      <span className="comms-msg-time">{fmtTime(msg.timestamp)}</span>
                    </div>
                  )}
                  {msg.text && <div className="comms-msg-text">{renderMentions(msg.text, staff)}</div>}
                  {msg.photoBase64 && <img className="comms-msg-photo" src={msg.photoBase64} alt="attachment" onClick={()=>window.open(msg.photoBase64,"_blank")}/>}
                </div>
              </div>
            );
          })}
          <div ref={msgsEndRef}/>
        </div>

        {/* Photo preview */}
        {photo && (
          <div className="comms-preview">
            <img src={photo.preview} alt="preview"/>
            <button className="btn btn-ghost btn-xs" onClick={()=>setPhoto(null)} style={{padding:2}}><IcX size={14}/></button>
          </div>
        )}

        {/* Input bar or read-only notice */}
        {canPost ? (
          <div className="comms-input-bar" style={{position:"relative"}}>
            {mentionQuery !== null && mentionMatches.length > 0 && (
              <div className="comms-mention-dd">
                {mentionMatches.map((s,i)=>(
                  <div key={s.id} className={`comms-mention-dd-item${i===mentionIdx?" active":""}`}
                    onMouseDown={(e)=>{e.preventDefault();insertMention(s);}}>
                    @{s.name}
                  </div>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFileSelect}/>
            <button className="btn btn-ghost btn-xs" onClick={()=>fileRef.current?.click()} style={{padding:4,color:"var(--t3)"}}>
              <IcPaperclip size={16}/>
            </button>
            <textarea
              ref={inputRef}
              className="inp"
              rows={1}
              value={text}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${channelInfo.type==="company"?channelInfo.name:channelInfo.name}…`}
              style={{minHeight:20,maxHeight:120}}
            />
            <button className="btn btn-primary btn-xs" onClick={handleSend} style={{padding:"4px 10px"}}>
              <IcSend size={14}/>
            </button>
          </div>
        ) : (
          <div className="comms-readonly">Only admins can post in #announcements</div>
        )}
      </div>
    </div>
  );
}
