"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Download, ImagePlus, Sparkles, X } from "lucide-react";

type Photo = { id: string | number; mission: string; slot: string; filename: string; photographer: string; url: string };
type Group = { id: string | number; name: string; photos: Photo[]; posterUrl?: string | null };
type Stage = "overview" | "mission" | "poster";
type Mission = { id: string; title: string; subtitle: string; location: string; observation: string; questions: string[]; shots: { label: string; instruction: string }[]; image: string; imageAlt: string; tone: string };

const MIRO_URL = "https://miro.com/app/board/uXjVHvXSago=/?share_link_id=388276372730";
const missions: Mission[] = [
  {
    id: "form", title: "FORM", subtitle: "See the whole building", tone: "yellow",
    location: "Start in the public space outside M+. Walk far enough back to see both the low podium and the tall tower.",
    observation: "Move around the building before taking your photographs. Compare its outline from different directions.",
    questions: ["How is the building shaped?", "What are the main geometric forms of M+?", "Why might the architect combine a low horizontal base with a tall vertical tower?"],
    shots: [
      { label: "Front view", instruction: "Show the full building from directly in front." },
      { label: "Side view", instruction: "Move to the side so the podium and tower overlap differently." },
      { label: "Distant view", instruction: "Step back across the public space and include the building in its setting." },
    ],
    image: "/images/mplus-exterior-day.jpg", imageAlt: "Daylight view of the M+ building and public space",
  },
  {
    id: "material", title: "MATERIAL", subtitle: "Read the surface", tone: "red",
    location: "Go close to an accessible exterior facade. Look carefully at the dark ceramic surface without touching or crossing barriers.",
    observation: "Notice colour, reflection, texture and repeated parts. Change your position to see how the surface responds to light.",
    questions: ["What is the building made of, and why?", "Is it one colour? Does it change with light?", "Is its texture smooth, rough, glossy, or matte?", "Can you identify a repeated element or surface pattern?"],
    shots: [{ label: "Facade close-up", instruction: "Fill the frame with the repeated ceramic pattern so its texture is easy to see." }],
    image: "/images/mplus-detail.jpg", imageAlt: "Close-up of the repeated glazed terracotta facade at M+",
  },
  {
    id: "light", title: "LIGHT", subtitle: "Notice the experience", tone: "blue",
    location: "Find a public interior space such as the atrium or Grand Stair. Choose a spot where daylight, shadow or a view changes how the space feels.",
    observation: "Stand still for a moment. Notice where your eyes go and how the space affects your mood.",
    questions: ["How does architecture shape what people feel and experience?", "Where does your eye go first?", "Does the space feel open, enclosed, bright, dark, monumental, or intimate?", "How do light and views influence your experience?"],
    shots: [{ label: "Light + person", instruction: "Photograph light or shadow in the space with a person for scale. A silhouette is fine." }],
    image: "/images/mplus-atrium.jpg", imageAlt: "M+ atrium showing light, structure and circulation",
  },
  {
    id: "place", title: "PLACE & IDENTITY", subtitle: "Place M+ in Hong Kong", tone: "pink",
    location: "Go to an accessible viewpoint around M+ or the harbourfront. Find a composition that connects M+, Victoria Harbour, the Hong Kong skyline and public space.",
    observation: "Look beyond the walls. Think about what the harbour, skyline and people add to the building.",
    questions: ["How does the building belong to this place?", "Would M+ feel the same if this exact building were placed somewhere else?"],
    shots: [{ label: "M+ in context", instruction: "Take one wide photo that includes the harbour, skyline and public space. Include part of M+ if your viewpoint allows." }],
    image: "/images/mplus-roof-garden.png", imageAlt: "M+ terrace and public space with the Hong Kong skyline beyond",
  },
];

const photoCount = missions.reduce((count, mission) => count + mission.shots.length, 0);

export default function Home() {
  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState("TonyTest");
  const [stage, setStage] = useState<Stage>("overview");
  const [missionIndex, setMissionIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [poster, setPoster] = useState("");
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const current = missions[missionIndex];
  const allPhotos = group?.photos ?? [];
  const completeCount = useMemo(() => missions.reduce((count, mission) => count + mission.shots.filter((_, slot) => allPhotos.some((photo) => photo.mission === mission.id && photo.slot === String(slot))).length, 0), [allPhotos]);
  const isLocalPreview = () => ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const missionComplete = (mission: Mission) => mission.shots.every((_, slot) => allPhotos.some((photo) => photo.mission === mission.id && photo.slot === String(slot) && photo.photographer.trim()));
  const canOpenMission = (index: number) => missions.slice(0, index).every(missionComplete);

  useEffect(() => {
    const saved = localStorage.getItem("mplus-group");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Group;
      if (String(parsed.id).startsWith("local-") && ["localhost", "127.0.0.1"].includes(window.location.hostname)) {
        setGroup(parsed);
        if (parsed.posterUrl) setPoster(parsed.posterUrl);
      } else if (!String(parsed.id).startsWith("local-")) {
        fetch("/api/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: parsed.name }) })
          .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not restore the group."); return data.group as Group; })
          .then((fresh) => { setGroup(fresh); localStorage.setItem("mplus-group", JSON.stringify(fresh)); if (fresh.posterUrl) setPoster(fresh.posterUrl); })
          .catch(() => { localStorage.removeItem("mplus-group"); setNotice("Enter your group name to load its saved photographs."); });
      } else {
        localStorage.removeItem("mplus-group");
      }
    } catch {
      localStorage.removeItem("mplus-group");
    }
  }, []);

  function saveGroup(next: Group) {
    setGroup(next);
    localStorage.setItem("mplus-group", JSON.stringify(next));
    if (String(next.id).startsWith("local-")) localStorage.setItem(`mplus-group-${next.name.toLowerCase()}`, JSON.stringify(next));
  }

  async function enterGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/groups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: clean }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not open this group.");
      saveGroup(data.group);
    } catch (error) {
      if (!isLocalPreview()) {
        setNotice(error instanceof Error ? error.message : "Could not open this group. Please try again.");
        setBusy(false);
        return;
      }
      const key = `mplus-group-${clean.toLowerCase()}`;
      let preview: Group = { id: `local-${clean.toLowerCase()}`, name: clean, photos: [] };
      try { const saved = localStorage.getItem(key); if (saved) preview = JSON.parse(saved) as Group; } catch { /* keep empty preview */ }
      saveGroup(preview);
      setNotice("Local preview: photographs stay in this browser until the database is connected.");
    } finally {
      setStage("overview");
      setBusy(false);
    }
  }

  async function compressPhoto(file: File) {
    const source = URL.createObjectURL(file);
    try {
      const image = new window.Image();
      image.src = source;
      await image.decode();
      const scale = Math.min(1, 1500 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not prepare this photo.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not compress this photo.")), "image/jpeg", 0.78));
      return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
    } finally { URL.revokeObjectURL(source); }
  }

  async function uploadPhoto(file: File, missionId: string, slot: number) {
    const key = `${missionId}-${slot}`;
    const existing = allPhotos.find((photo) => photo.mission === missionId && photo.slot === String(slot));
    const photographer = (authors[key] ?? existing?.photographer ?? "").trim();
    if (!photographer) { setNotice("Enter the photographer’s name for this frame, then choose a photograph."); return; }
    setBusy(true);
    setNotice("");
    try {
      const prepared = await compressPhoto(file);
      if (String(group?.id).startsWith("local-")) {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read the photo."));
          reader.readAsDataURL(prepared);
        });
        const next: Group = { ...group!, photos: [...allPhotos.filter((photo) => !(photo.mission === missionId && photo.slot === String(slot))), { id: key, mission: missionId, slot: String(slot), filename: prepared.name, photographer, url }] };
        saveGroup(next);
      } else {
        const form = new FormData();
        form.set("groupId", String(group?.id)); form.set("mission", missionId); form.set("slot", String(slot)); form.set("photographer", photographer); form.set("file", prepared);
        const response = await fetch("/api/photos", { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        saveGroup(data.group);
      }
      setNotice("Photo saved. Continue with the next frame or mission.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Photo upload failed."); }
    finally { setBusy(false); }
  }

  async function makeLocalPoster() {
    const canvas = document.createElement("canvas"); canvas.width = 2400; canvas.height = 1600;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not make the poster.");
    context.fillStyle = "#f5f0e5"; context.fillRect(0, 0, 2400, 1600);
    context.fillStyle = "#181818"; context.fillRect(0, 0, 2400, 18);
    context.fillStyle = "#ed4937"; context.fillRect(110, 80, 228, 94);
    context.fillStyle = "#fff"; context.font = "bold 56px Arial"; context.fillText("M+6066", 128, 147);
    context.fillStyle = "#181818"; context.font = "bold 36px Arial"; context.fillText("FORM + MATERIAL + LIGHT + PLACE = ?", 370, 143);
    context.font = "bold 142px Arial"; context.fillText(group!.name.toUpperCase(), 110, 329);
    context.fillStyle = "#2f60b9"; context.fillRect(110, 359, 480, 18);
    const frames = [
      { mission: "form", slot: 0, label: "01 / FORM — FRONT", x: 110, y: 430, w: 1030, h: 450, color: "#f4d64c" },
      { mission: "form", slot: 1, label: "02 / FORM — SIDE", x: 1170, y: 430, w: 510, h: 450, color: "#f4d64c" },
      { mission: "material", slot: 0, label: "04 / MATERIAL", x: 1710, y: 430, w: 580, h: 450, color: "#f26a50" },
      { mission: "form", slot: 2, label: "03 / FORM — DISTANCE", x: 110, y: 960, w: 510, h: 400, color: "#f4d64c" },
      { mission: "light", slot: 0, label: "05 / LIGHT", x: 650, y: 960, w: 730, h: 400, color: "#699bd7" },
      { mission: "place", slot: 0, label: "06 / PLACE & IDENTITY", x: 1410, y: 960, w: 880, h: 400, color: "#eda9ba" },
    ];
    for (const frame of frames) {
      const photo = allPhotos.find((entry) => entry.mission === frame.mission && entry.slot === String(frame.slot));
      context.fillStyle = "#e4e1d7"; context.fillRect(frame.x, frame.y, frame.w, frame.h);
      if (photo) {
        const image = new window.Image(); image.crossOrigin = "anonymous"; image.src = photo.url; await image.decode();
        const ratio = Math.max(frame.w / image.width, frame.h / image.height);
        const width = image.width * ratio, height = image.height * ratio;
        context.save(); context.beginPath(); context.rect(frame.x, frame.y, frame.w, frame.h); context.clip();
        context.drawImage(image, frame.x + (frame.w - width) / 2, frame.y + (frame.h - height) / 2, width, height); context.restore();
      }
      context.fillStyle = frame.color; context.fillRect(frame.x, frame.y + frame.h, frame.w, 58);
      context.fillStyle = "#181818"; context.font = "bold 22px Arial"; context.fillText(frame.label, frame.x + 16, frame.y + frame.h + 37);
      if (photo) { context.font = "19px Arial"; context.fillText(`PHOTO: ${photo.photographer}`, frame.x + 6, frame.y + frame.h + 82); }
    }
    context.fillStyle = "#181818"; context.fillRect(0, 1525, 2400, 75);
    context.fillStyle = "#f5f0e5"; context.font = "25px Arial"; context.fillText("A GROUP STUDY OF M+  /  WEST KOWLOON, HONG KONG", 110, 1573);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not export the poster.")), "image/png"));
    setPoster(URL.createObjectURL(blob));
  }

  async function generatePoster() {
    if (completeCount < photoCount) { setNotice(`Upload all ${photoCount} photographs before generating the poster.`); return; }
    setBusy(true); setNotice("");
    try {
      if (String(group?.id).startsWith("local-")) throw new Error("Local preview");
      const response = await fetch("/api/poster", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ groupId: group?.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Poster generation is unavailable.");
      setPoster(data.url);
    } catch (error) {
      if (!isLocalPreview()) {
        setNotice(error instanceof Error ? error.message : "The image engine could not make your poster. Please try again.");
        setBusy(false);
        return;
      }
      try { await makeLocalPoster(); setNotice("Preview poster made from your six photographs. AI artwork is available after Volcengine is connected."); }
      catch (error) { setNotice(error instanceof Error ? error.message : "Could not make the poster."); return; }
    } finally { setBusy(false); }
    setStage("poster"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function switchGroup() { localStorage.removeItem("mplus-group"); setGroup(null); setPoster(""); setStage("overview"); setNotice(""); }
  function openMission(index: number) {
    if (!canOpenMission(index)) { setNotice("Finish every photo and photographer name in the current mission before moving on."); return; }
    setMissionIndex(index); setStage("mission"); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!group) return (
    <main className="login-screen">
      <section className="login-visual">
        <Image src="/images/mplus-building.jpg" alt="M+ and Victoria Harbour at dusk" fill priority sizes="(max-width: 800px) 100vw, 56vw" />
        <div className="login-visual-top"><strong>M+6066</strong><span>AN ARCHITECTURE FIELD STUDY<br />WEST KOWLOON, HONG KONG</span></div>
        <div className="login-visual-bottom"><span>FORM + MATERIAL<br />+ LIGHT + PLACE</span><b>= YOUR VIEW</b></div>
      </section>
      <section className="login-panel">
        <div className="login-topline">M+6066 <span>01 / GROUP ENTRY</span></div>
        <div className="login-inner">
          <div className="colour-tile">4 MISSIONS <span>×</span> 6 PHOTOS <span>=</span> 1 POSTER</div>
          <p className="eyebrow">SELF-GUIDED GROUP EXPERIENCE</p>
          <h1>Look again.<br /><em>Look closer.</em></h1>
          <p className="intro-copy">Explore the architecture of M+ together. Start with the museum, follow four photo missions, then make one group poster.</p>
          <form onSubmit={enterGroup} className="login-form">
            <label htmlFor="group-name">YOUR GROUP NAME</label>
            <input id="group-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. TonyTest" maxLength={48} />
            <button disabled={busy || !name.trim()} className="primary-button">{busy ? "OPENING…" : "ENTER AS A GROUP"}<ArrowRight size={22} /></button>
          </form>
          <p className="login-note">Group example: <strong>TonyTest</strong>. You will meet M+ before Mission 1.</p>
          {notice && <p className="notice" role="status">{notice}</p>}
        </div>
        <div className="login-footer"><span>6066 / M+ / HONG KONG</span><a href="https://www.mplus.org.hk/en/" target="_blank" rel="noreferrer">OFFICIAL M+ WEBSITE <ArrowUpRight size={17} /></a></div>
      </section>
    </main>
  );

  return (
    <main className="site-shell">
      <header className="site-header">
        <button className="brand" onClick={() => setStage("overview")} aria-label="Go to M+6066 introduction">M<span>+</span>6066</button>
        <div className="header-equation">FORM + MATERIAL + LIGHT + PLACE <b>= ?</b></div>
        <div className="header-right"><span className="group-name">GROUP / <b>{group.name}</b></span><button onClick={switchGroup} className="switch-button">SWITCH GROUP</button></div>
      </header>
      <nav className="journey-nav" aria-label="Field study steps">
        <button className={stage === "overview" ? "active" : ""} onClick={() => setStage("overview")}><span>00</span> MEET M+</button>
        {missions.map((mission, index) => <button key={mission.id} className={`${stage === "mission" && missionIndex === index ? "active" : ""} ${mission.tone}`} onClick={() => openMission(index)} disabled={!canOpenMission(index)}><span>0{index + 1}</span> {mission.title} {missionComplete(mission) && <Check size={17} />}</button>)}
        <button className={stage === "poster" ? "active" : ""} onClick={() => poster && setStage("poster")} disabled={!poster}><span>05</span> POSTER + MIRO</button>
      </nav>

      {stage === "overview" && <>
        <section className="overview-hero">
          <div className="overview-hero-copy">
            <div className="section-tag">00 / FIRST, MEET THE BUILDING</div>
            <h1>M<span>+</span>6066<br /><small>=</small> <em>look closer.</em></h1>
            <p>M+ is a museum of contemporary visual culture on Hong Kong’s West Kowloon waterfront. Its architecture gives us four questions to explore: <strong>form, material, light and place.</strong></p>
            <button className="hero-button" onClick={() => openMission(0)}>START MISSION 1 — FORM <ArrowRight size={24} /></button>
          </div>
          <div className="overview-hero-photo"><Image src="/images/mplus-exterior-day.jpg" alt="The M+ building beside its public space" fill priority sizes="(max-width: 800px) 100vw, 55vw" /><span>01 / THE BUILDING FROM OUTSIDE</span></div>
        </section>

        <section className="museum-intro section-wrap">
          <div className="intro-heading"><span className="section-tag">ABOUT M+ / HONG KONG</span><h2>One building.<br />Many ways to see it.</h2></div>
          <div className="intro-details"><p className="large-copy">M+ sits in the West Kowloon Cultural District, facing Victoria Harbour. Designed by Herzog & de Meuron with TFP Farrells and Arup, its low, wide base and slender tower form a distinctive inverted T.</p><p>The museum brings visual art, design, architecture and moving image together. The building includes 33 galleries, three cinemas, public spaces and a roof garden. Its harbour-facing LED facade also turns the tower into a giant surface for moving images.</p><a href="https://www.mplus.org.hk/en/the-building/" target="_blank" rel="noreferrer" className="source-link">READ MORE ON THE OFFICIAL M+ SITE <ArrowUpRight size={18} /></a></div>
        </section>

        <section className="image-story section-wrap" aria-label="Get to know the architecture">
          <div className="story-card story-red"><div className="story-image"><Image src="/images/mplus-ceramic.jpg" alt="Glazed terracotta ribs at M+" fill sizes="(max-width: 800px) 100vw, 33vw" /></div><div><span>01 / SURFACE</span><h3>Dark green ceramic,<br />never quite the same.</h3><p>Glazed terracotta covers the building. Its repeated ribs catch changing light, so the surface can look different as you move.</p></div></div>
          <div className="story-card story-blue"><div className="story-image"><Image src="/images/mplus-atrium.jpg" alt="Interior atrium at M+" fill sizes="(max-width: 800px) 100vw, 33vw" /></div><div><span>02 / SPACE</span><h3>Inside, scale becomes<br />an experience.</h3><p>Open interior spaces, circulation and shifting views invite you to notice how architecture guides your eye and body.</p></div></div>
          <div className="story-card story-yellow"><div className="story-image"><Image src="/images/mplus-roof-garden.png" alt="M+ terrace overlooking Hong Kong" fill sizes="(max-width: 800px) 100vw, 33vw" /></div><div><span>03 / CITY</span><h3>A museum facing<br />Hong Kong.</h3><p>The roof garden and public spaces bring the building into conversation with the harbour, skyline and people around it.</p></div></div>
        </section>

        <section className="how-it-works section-wrap">
          <div className="section-tag">YOUR GROUP’S ROUTE / 00 → 05</div><h2>What you will do.</h2>
          <div className="route-grid">
            <div><strong>01</strong><h3>Meet M+</h3><p>Read this introduction and look at the reference photographs. Then begin at FORM.</p></div>
            <div><strong>02</strong><h3>Visit four places</h3><p>Follow each mission’s location and photo directions. Think about the questions as you look.</p></div>
            <div><strong>03</strong><h3>Upload six photos</h3><p>Take three FORM photos and one for each other mission. Enter a photographer’s name for every photo.</p></div>
            <div><strong>04</strong><h3>Poster → Miro</h3><p>Generate and save your group poster. Put it in your group’s space on Miro and answer the reflection questions there.</p></div>
          </div>
          <div className="overview-cta"><span>FORM + MATERIAL + LIGHT + PLACE <b>= YOUR VIEW</b></span><button onClick={() => openMission(0)}>START MISSION 1 <ArrowRight size={23} /></button></div>
        </section>
      </>}

      {stage === "mission" && <>
        <section className={`mission-hero ${current.tone}`}>
          <div className="mission-hero-copy"><span className="section-tag">MISSION 0{missionIndex + 1} / 04</span><h1>{current.title}<span>.</span></h1><p>{current.subtitle}</p><div className="mission-count">{current.shots.length} {current.shots.length === 1 ? "PHOTO" : "PHOTOS"} TO TAKE <span>·</span> {completeCount} / {photoCount} UPLOADED</div></div>
          <div className="mission-hero-photo"><Image src={current.image} alt={current.imageAlt} fill sizes="(max-width: 800px) 100vw, 49vw" /><span>LOOK / OBSERVE / PHOTOGRAPH</span></div>
        </section>
        <div className="mission-body section-wrap">
          <div className="mission-instructions">
            <section className="instruction-card"><span className="instruction-number">01 / GO</span><h2>Where to go</h2><p>{current.location}</p></section>
            <section className="instruction-card"><span className="instruction-number">02 / LOOK</span><h2>What to notice</h2><p>{current.observation}</p></section>
            <section className="instruction-card question-card"><span className="instruction-number">03 / THINK</span><h2>Questions to discuss</h2><ul>{current.questions.map((question) => <li key={question}>{question}</li>)}</ul><p className="answer-reminder">Keep your thoughts in mind. You will write your answers on Miro after making the poster.</p></section>
          </div>
          <section className="photo-section">
            <div className="photo-section-heading"><span className="instruction-number">04 / TAKE + UPLOAD</span><h2>{current.shots.length === 1 ? "Take this photo." : "Take these three photos."}</h2><p>For each frame: follow the direction, type the photographer’s name, then choose the photograph to upload.</p></div>
            <div className={`photo-grid ${current.shots.length === 1 ? "one-photo" : ""}`}>
              {current.shots.map((shot, slot) => {
                const photo = allPhotos.find((entry) => entry.mission === current.id && entry.slot === String(slot));
                const key = `${current.id}-${slot}`;
                return <div className="photo-card" key={key}>
                  <div className="photo-card-top"><span>FRAME 0{slot + 1}</span>{photo && <span className="saved-badge"><Check size={17} /> SAVED</span>}</div>
                  <h3>{shot.label}</h3><p>{shot.instruction}</p>
                  {photo && <div className="photo-preview"><img src={photo.url} alt={`${shot.label} by ${photo.photographer}`} /><span>PHOTO BY {photo.photographer}</span></div>}
                  <label htmlFor={`photographer-${key}`} className="photographer-label">PHOTOGRAPHER’S NAME</label>
                  <input id={`photographer-${key}`} className="photographer-input" value={authors[key] ?? photo?.photographer ?? ""} onChange={(event) => setAuthors({ ...authors, [key]: event.target.value })} placeholder="Who took this photo?" maxLength={60} />
                  <button className="upload-button" disabled={busy} onClick={() => { inputRef.current?.setAttribute("data-mission", current.id); inputRef.current?.setAttribute("data-slot", String(slot)); inputRef.current?.click(); }}><ImagePlus size={21} />{photo ? "REPLACE PHOTOGRAPH" : "CHOOSE + UPLOAD PHOTO"}</button>
                </div>;
              })}
            </div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; const mission = event.currentTarget.getAttribute("data-mission") || current.id; const slot = Number(event.currentTarget.getAttribute("data-slot") || 0); if (file) uploadPhoto(file, mission, slot); event.currentTarget.value = ""; }} />
          </section>
          {notice && <div className="notice-bar" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={20} /></button></div>}
          <div className="mission-actions"><button className="back-button" onClick={() => missionIndex === 0 ? setStage("overview") : openMission(missionIndex - 1)}><ArrowLeft size={20} />{missionIndex === 0 ? "BACK TO M+ INTRO" : "PREVIOUS MISSION"}</button>{missionIndex < 3 ? <button className="next-button" onClick={() => openMission(missionIndex + 1)} disabled={busy || !missionComplete(current)}>{missionComplete(current) ? `NEXT: ${missions[missionIndex + 1].title}` : `UPLOAD ${current.shots.length === 1 ? "THE PHOTO" : `ALL ${current.shots.length} PHOTOS`} TO CONTINUE`} <ArrowRight size={21} /></button> : <button className="next-button" onClick={generatePoster} disabled={busy || completeCount < photoCount}><Sparkles size={20} />{busy ? "MAKING POSTER…" : completeCount < photoCount ? `UPLOAD ALL ${photoCount} PHOTOS FIRST` : "GENERATE GROUP POSTER"}</button>}</div>
          {!missionComplete(current) && <p className="completion-help">This mission unlocks the next step only after every frame has a saved photograph and photographer name.</p>}
        </div>
      </>}

      {stage === "poster" && <section className="poster-page section-wrap">
        <div className="section-tag">05 / YOUR GROUP’S FINAL BOARD</div><h1>{group.name}<span> × </span>M+6066</h1><p className="poster-lead">Your six views have become one group poster. Finish the activity together on Miro.</p>
        {poster && <div className="poster-preview"><img src={poster} alt={`M+6066 poster for ${group.name}`} /></div>}
        {notice && <div className="notice-bar" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={20} /></button></div>}
        <div className="miro-panel"><div className="miro-heading"><span>FINAL STEPS / DO THESE IN ORDER</span><h2>Poster → Miro → answers.</h2></div><ol><li><strong>Save the poster.</strong> Download the image to your device.</li><li><strong>Open the class Miro board.</strong> Find the space assigned to your group.</li><li><strong>Place your poster there.</strong> Upload the saved image to your group’s space.</li><li><strong>Answer the reflection questions.</strong> Add written responses for FORM, MATERIAL, LIGHT and PLACE & IDENTITY beside the poster. Discuss what your photographs show.</li></ol><div className="miro-actions"><a href={poster} download={`Mplus6066-${group.name.replace(/[^a-z0-9-]/gi, "-")}.png`} target="_blank" rel="noreferrer" className="save-button"><Download size={21} /> SAVE POSTER</a><a href={MIRO_URL} target="_blank" rel="noreferrer" className="miro-button">OPEN THE CLASS MIRO BOARD <ArrowUpRight size={23} /></a></div></div>
        <button className="back-button poster-back" onClick={() => openMission(3)}><ArrowLeft size={19} /> BACK TO MISSION 4</button>
      </section>}
      <footer className="site-footer"><strong>M+6066</strong><span>FORM + MATERIAL + LIGHT + PLACE = YOUR VIEW</span><a href="https://www.mplus.org.hk/en/the-building/design/" target="_blank" rel="noreferrer">PHOTOS & BUILDING INFORMATION: M+ <ArrowUpRight size={16} /></a></footer>
    </main>
  );
}
