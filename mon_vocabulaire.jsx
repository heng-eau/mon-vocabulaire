import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "french-vocab-list";

const defaultWords = [
  { id: 1, fr: "tasse", zh: "茶杯（有把手，装热饮）", example: "Une tasse de café" },
  { id: 2, fr: "verre", zh: "玻璃杯（没把手，装冷饮）", example: "Un verre d'eau" },
  { id: 3, fr: "peut-être", zh: "也许", example: "Peut-être demain" },
  { id: 4, fr: "mince", zh: "糟糕（感叹词）", example: "Mince, j'ai oublié !" },
  { id: 5, fr: "s'il te plaît", zh: "请（对亲近的人）", example: "Un café, s'il te plaît" },
  { id: 6, fr: "s'il vous plaît", zh: "请（对陌生人/正式）", example: "L'addition, s'il vous plaît" },
  { id: 7, fr: "trop", zh: "太（过度）", example: "C'est trop cher" },
  { id: 8, fr: "très", zh: "很（程度高）", example: "C'est très bon" },
  { id: 9, fr: "déjeuner", zh: "午餐", example: "Le déjeuner est prêt" },
  { id: 10, fr: "repas", zh: "一顿饭（泛指）", example: "Un bon repas" },
  { id: 11, fr: "bonjour", zh: "你好", example: "Bonjour, comment allez-vous ?" },
];

export default function MonVocabulaire() {
  const [words, setWords] = useState(defaultWords);
  const [loaded, setLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [interval, setIntervalTime] = useState(3);
  const [showAdd, setShowAdd] = useState(false);
  const [newFr, setNewFr] = useState("");
  const [newZh, setNewZh] = useState("");
  const [newExample, setNewExample] = useState("");
  const [showMeaning, setShowMeaning] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editFr, setEditFr] = useState("");
  const [editZh, setEditZh] = useState("");
  const [editExample, setEditExample] = useState("");
  const [view, setView] = useState("player");
  const timerRef = useRef(null);
  const playingRef = useRef(false);
  const indexRef = useRef(0);

  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          const parsed = JSON.parse(result.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setWords(parsed);
          }
        }
      } catch (e) {
        // no saved data, use defaults
      }
      setLoaded(true);
    }
    load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    async function save() {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify(words));
      } catch (e) {
        // storage error
      }
    }
    save();
  }, [words, loaded]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      u.rate = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const frVoice = voices.find(v => v.lang.startsWith("fr"));
      if (frVoice) u.voice = frVoice;
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
    });
  }, []);

  const playWord = useCallback((index) => {
    if (index < 0 || index >= words.length) return;
    setCurrentIndex(index);
    speak(words[index].fr);
  }, [words, speak]);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const advance = () => {
      if (!playingRef.current) return;
      const nextIndex = indexRef.current + 1;
      if (nextIndex >= words.length) {
        if (loop) {
          setCurrentIndex(0);
          indexRef.current = 0;
          speak(words[0].fr).then(() => {
            if (playingRef.current) {
              timerRef.current = setTimeout(advance, interval * 1000);
            }
          });
        } else {
          setIsPlaying(false);
        }
      } else {
        setCurrentIndex(nextIndex);
        indexRef.current = nextIndex;
        speak(words[nextIndex].fr).then(() => {
          if (playingRef.current) {
            timerRef.current = setTimeout(advance, interval * 1000);
          }
        });
      }
    };

    speak(words[indexRef.current].fr).then(() => {
      if (playingRef.current) {
        timerRef.current = setTimeout(advance, interval * 1000);
      }
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, loop, interval, words, speak]);

  const handleAdd = () => {
    if (!newFr.trim()) return;
    const maxId = words.reduce((max, w) => Math.max(max, w.id), 0);
    const newWord = {
      id: maxId + 1,
      fr: newFr.trim(),
      zh: newZh.trim(),
      example: newExample.trim(),
    };
    setWords([...words, newWord]);
    setNewFr("");
    setNewZh("");
    setNewExample("");
    setShowAdd(false);
  };

  const handleDelete = (id) => {
    const filtered = words.filter(w => w.id !== id);
    setWords(filtered);
    if (currentIndex >= filtered.length) setCurrentIndex(Math.max(0, filtered.length - 1));
  };

  const startEdit = (word) => {
    setEditingId(word.id);
    setEditFr(word.fr);
    setEditZh(word.zh);
    setEditExample(word.example || "");
  };

  const saveEdit = () => {
    setWords(words.map(w => w.id === editingId ? { ...w, fr: editFr, zh: editZh, example: editExample } : w));
    setEditingId(null);
  };

  const current = words[currentIndex] || null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(165deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
      color: "#e0e0e0",
      fontFamily: "'SF Pro Text', -apple-system, 'Microsoft YaHei', sans-serif",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        padding: "20px 24px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#e8c87a", letterSpacing: "1px" }}>
            Mon Vocabulaire
          </div>
          <div style={{ fontSize: "12px", color: "#7a7a9a", marginTop: "2px" }}>
            {words.length} mots · 阿衡的法语磨耳朵
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setView("player")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              background: view === "player" ? "#e8c87a" : "rgba(255,255,255,0.08)",
              color: view === "player" ? "#1a1a2e" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            播放
          </button>
          <button
            onClick={() => setView("list")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "none",
              background: view === "list" ? "#e8c87a" : "rgba(255,255,255,0.08)",
              color: view === "list" ? "#1a1a2e" : "#888",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            词库
          </button>
        </div>
      </div>

      {view === "player" && current && (
        <div style={{ padding: "20px 24px" }}>
          {/* Current word card */}
          <div style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: "20px",
            padding: "40px 24px",
            textAlign: "center",
            marginBottom: "24px",
            border: "1px solid rgba(232,200,122,0.15)",
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              top: "16px",
              right: "20px",
              fontSize: "12px",
              color: "#7a7a9a",
            }}>
              {currentIndex + 1} / {words.length}
            </div>

            <div style={{
              fontSize: "42px",
              fontWeight: 300,
              color: "#fff",
              letterSpacing: "2px",
              marginBottom: "16px",
              fontStyle: "italic",
            }}>
              {current.fr}
            </div>

            {showMeaning && (
              <>
                <div style={{
                  fontSize: "16px",
                  color: "#b0b0c8",
                  marginBottom: "8px",
                }}>
                  {current.zh}
                </div>
                {current.example && (
                  <div style={{
                    fontSize: "14px",
                    color: "#7a7a9a",
                    fontStyle: "italic",
                    marginTop: "12px",
                  }}>
                    "{current.example}"
                  </div>
                )}
              </>
            )}

            <button
              onClick={() => setShowMeaning(!showMeaning)}
              style={{
                marginTop: "16px",
                background: "none",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#7a7a9a",
                padding: "4px 12px",
                borderRadius: "12px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {showMeaning ? "隐藏释义" : "显示释义"}
            </button>
          </div>

          {/* Progress bar */}
          <div style={{
            height: "3px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "2px",
            marginBottom: "24px",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${((currentIndex + 1) / words.length) * 100}%`,
              background: "linear-gradient(90deg, #e8c87a, #d4a853)",
              borderRadius: "2px",
              transition: "width 0.3s ease",
            }} />
          </div>

          {/* Controls */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "20px",
            marginBottom: "24px",
          }}>
            <button
              onClick={() => { 
                const prev = currentIndex > 0 ? currentIndex - 1 : words.length - 1;
                setCurrentIndex(prev);
                speak(words[prev].fr);
              }}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#ccc",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ◁
            </button>

            <button
              onClick={() => {
                if (isPlaying) {
                  setIsPlaying(false);
                  window.speechSynthesis.cancel();
                } else {
                  setIsPlaying(true);
                }
              }}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                border: "none",
                background: isPlaying
                  ? "linear-gradient(135deg, #d4a853, #e8c87a)"
                  : "linear-gradient(135deg, #e8c87a, #f0d88a)",
                color: "#1a1a2e",
                fontSize: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                boxShadow: "0 4px 20px rgba(232,200,122,0.3)",
              }}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>

            <button
              onClick={() => {
                const next = currentIndex < words.length - 1 ? currentIndex + 1 : 0;
                setCurrentIndex(next);
                speak(words[next].fr);
              }}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#ccc",
                fontSize: "18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ▷
            </button>
          </div>

          {/* Settings row */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "24px",
            flexWrap: "wrap",
          }}>
            <button
              onClick={() => setLoop(!loop)}
              style={{
                padding: "6px 16px",
                borderRadius: "16px",
                border: "1px solid",
                borderColor: loop ? "#e8c87a" : "rgba(255,255,255,0.15)",
                background: loop ? "rgba(232,200,122,0.15)" : "transparent",
                color: loop ? "#e8c87a" : "#888",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              🔁 循环 {loop ? "开" : "关"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "13px", color: "#888" }}>间隔</span>
              <input
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={interval}
                onChange={e => setIntervalTime(Number(e.target.value))}
                style={{ width: "80px", accentColor: "#e8c87a" }}
              />
              <span style={{ fontSize: "13px", color: "#e8c87a", minWidth: "28px" }}>{interval}s</span>
            </div>

            <button
              onClick={() => speak(current.fr)}
              style={{
                padding: "6px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#ccc",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              🔊 再念一遍
            </button>
          </div>
        </div>
      )}

      {view === "list" && (
        <div style={{ padding: "12px 24px 100px" }}>
          {/* Add button */}
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              border: "1px dashed rgba(232,200,122,0.4)",
              background: "rgba(232,200,122,0.08)",
              color: "#e8c87a",
              fontSize: "14px",
              cursor: "pointer",
              marginBottom: "16px",
            }}
          >
            + 添加新单词
          </button>

          {showAdd && (
            <div style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid rgba(232,200,122,0.15)",
            }}>
              <input
                value={newFr}
                onChange={e => setNewFr(e.target.value)}
                placeholder="法语单词"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: "15px",
                  marginBottom: "8px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <input
                value={newZh}
                onChange={e => setNewZh(e.target.value)}
                placeholder="中文释义"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: "15px",
                  marginBottom: "8px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <input
                value={newExample}
                onChange={e => setNewExample(e.target.value)}
                placeholder="例句（选填）"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#fff",
                  fontSize: "15px",
                  marginBottom: "12px",
                  boxSizing: "border-box",
                  outline: "none",
                }}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleAdd}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#e8c87a",
                    color: "#1a1a2e",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  添加
                </button>
                <button
                  onClick={() => setShowAdd(false)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "transparent",
                    color: "#888",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Word list */}
          {words.map((word, i) => (
            <div
              key={word.id}
              style={{
                background: currentIndex === i ? "rgba(232,200,122,0.1)" : "rgba(255,255,255,0.04)",
                borderRadius: "12px",
                padding: "14px 16px",
                marginBottom: "8px",
                border: currentIndex === i ? "1px solid rgba(232,200,122,0.25)" : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {editingId === word.id ? (
                <div style={{ flex: 1 }}>
                  <input
                    value={editFr}
                    onChange={e => setEditFr(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "14px",
                      marginBottom: "4px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <input
                    value={editZh}
                    onChange={e => setEditZh(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "14px",
                      marginBottom: "4px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <input
                    value={editExample}
                    onChange={e => setEditExample(e.target.value)}
                    placeholder="例句"
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(0,0,0,0.3)",
                      color: "#fff",
                      fontSize: "14px",
                      marginBottom: "6px",
                      boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={saveEdit} style={{ padding: "4px 12px", borderRadius: "6px", border: "none", background: "#e8c87a", color: "#1a1a2e", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>保存</button>
                    <button onClick={() => setEditingId(null)} style={{ padding: "4px 12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#888", fontSize: "12px", cursor: "pointer" }}>取消</button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    style={{ flex: 1, cursor: "pointer" }}
                    onClick={() => {
                      setCurrentIndex(i);
                      speak(word.fr);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                      <span style={{ fontSize: "17px", color: "#fff", fontStyle: "italic" }}>{word.fr}</span>
                      <span style={{ fontSize: "13px", color: "#7a7a9a" }}>{word.zh}</span>
                    </div>
                    {word.example && (
                      <div style={{ fontSize: "12px", color: "#555", marginTop: "4px", fontStyle: "italic" }}>
                        {word.example}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "4px", marginLeft: "8px", flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(word)}
                      style={{
                        width: "30px", height: "30px", borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent", color: "#888",
                        fontSize: "13px", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✎</button>
                    <button
                      onClick={() => handleDelete(word.id)}
                      style={{
                        width: "30px", height: "30px", borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "transparent", color: "#664444",
                        fontSize: "13px", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >✕</button>
                  </div>
                </>
              )}
            </div>
          ))}

          {words.length === 0 && (
            <div style={{ textAlign: "center", color: "#555", padding: "40px 0", fontSize: "14px" }}>
              还没有单词，点上面添加吧
            </div>
          )}
        </div>
      )}
    </div>
  );
}
