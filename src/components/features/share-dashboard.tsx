"use client";

import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { Button, Modal, Progress } from "@/components/ui";
import { Share2, Download, Loader2 } from "lucide-react";
import type { AnnualGoal } from "@/types/database";

interface ShareDashboardProps {
  stats: {
    lido: number;
    lendo: number;
    nao_comecou: number;
    desistido: number;
    total_paginas_lidas: number;
    autores_unicos: number;
    generos_unicos: number;
    total_posts: number;
  } | null;
  goal: AnnualGoal | null;
  userName: string;
}

export function ShareDashboard({ stats, goal, userName }: ShareDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  const currentYear = new Date().getFullYear();
  const booksReadThisYear = stats?.lido || 0;
  const goalProgress = goal ? Math.min((booksReadThisYear / goal.goal_amount) * 100, 100) : 0;

  const generateImage = useCallback(async () => {
    if (!storyRef.current) return;

    setIsGenerating(true);

    try {
      // Wait for fonts and images to load
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(storyRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: 540,
        height: 960,
      });

      // Convert to blob URL instead of data URL to avoid iOS issues
      canvas.toBlob((blob) => {
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          setGeneratedImage(blobUrl);
        }
      }, "image/png", 1.0);
    } catch (error) {
      console.error("Error generating image:", error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleOpen = () => {
    // Revoke previous blob URL to avoid memory leak
    if (generatedImage) {
      URL.revokeObjectURL(generatedImage);
    }
    setIsOpen(true);
    setGeneratedImage(null);
    // Generate after modal opens
    setTimeout(generateImage, 100);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Clean up blob URL when closing
    if (generatedImage) {
      URL.revokeObjectURL(generatedImage);
      setGeneratedImage(null);
    }
  };

  const getImageFile = useCallback(async () => {
    if (!generatedImage) return null;
    try {
      const res = await fetch(generatedImage);
      const blob = await res.blob();
      return new File([blob], `babel-dashboard-${userName.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });
    } catch {
      return null;
    }
  }, [generatedImage, userName]);

  const handleDownload = async () => {
    if (!generatedImage) return;

    // On mobile, use share API which has "Save Image" option
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile && navigator.share) {
      try {
        const file = await getImageFile();
        if (file && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Salvar Dashboard Babel",
          });
          return;
        }
      } catch (error) {
        // User cancelled or error, fall through to download
      }
    }

    // Desktop or fallback: direct download
    const link = document.createElement("a");
    link.download = `babel-dashboard-${userName.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.href = generatedImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!generatedImage) return;

    try {
      const file = await getImageFile();

      if (file && navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Meu Dashboard Babel",
          text: "Confira minha jornada de leitura no Babel! 📚",
        });
      } else {
        // Fallback: download
        handleDownload();
      }
    } catch (error) {
      console.error("Error sharing:", error);
      // Only download if not user cancellation
      if ((error as Error).name !== "AbortError") {
        handleDownload();
      }
    }
  };

  return (
    <>
      <Button variant="outline" onClick={handleOpen} className="gap-2">
        <Share2 className="w-4 h-4" />
        Compartilhar
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} title="Compartilhar Dashboard">
        <div className="space-y-4">
          {/* Preview container */}
          <div className="flex justify-center">
            {generatedImage ? (
              <img
                src={generatedImage}
                alt="Dashboard preview"
                className="max-h-[60vh] rounded-lg shadow-lg"
              />
            ) : (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleShare}
              disabled={!generatedImage || isGenerating}
              className="flex-1 gap-2"
            >
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!generatedImage || isGenerating}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Salvar
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Salve a imagem e compartilhe nos Stories do Instagram!
          </p>
        </div>
      </Modal>

      {/* Hidden story template for capture */}
      <div className="fixed -left-[9999px] -top-[9999px]">
        <div
          ref={storyRef}
          style={{
            width: 540,
            height: 960,
            background: "linear-gradient(180deg, #f9f7f4 0%, #f2efe9 50%, #ebe6df 100%)",
            padding: 40,
            display: "flex",
            flexDirection: "column",
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "#2a2725",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background decoration */}
          <div
            style={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "rgba(160, 128, 80, 0.08)",
              filter: "blur(60px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -50,
              left: -50,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "rgba(160, 128, 80, 0.06)",
              filter: "blur(40px)",
            }}
          />

          {/* Logo */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <img
              src="/logo_cinza.png"
              alt="Babel"
              style={{ height: 48, objectFit: "contain" }}
              crossOrigin="anonymous"
            />
          </div>

          {/* User name */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <p style={{ fontSize: 14, color: "#7a7570", marginBottom: 4 }}>
              Jornada de Leitura de
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#2a2725" }}>
              {userName}
            </h1>
          </div>

          {/* Goal card */}
          {goal && (
            <div
              style={{
                background: "rgba(160, 128, 80, 0.1)",
                borderRadius: 16,
                padding: 20,
                marginBottom: 24,
                border: "1px solid rgba(160, 128, 80, 0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(160, 128, 80, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#2a2725" }}>Meta {currentYear}</span>
              </div>
              <p style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px 0", color: "#2a2725" }}>
                {booksReadThisYear} de {goal.goal_amount} livros
              </p>
              <div
                style={{
                  height: 8,
                  background: "rgba(160, 128, 80, 0.15)",
                  borderRadius: 4,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${goalProgress}%`,
                    background: "linear-gradient(90deg, #a08050, #c4a66a)",
                    borderRadius: 4,
                  }}
                />
              </div>
              {goalProgress >= 100 && (
                <p style={{ fontSize: 14, color: "#a08050", marginTop: 8 }}>
                  🎉 Meta atingida!
                </p>
              )}
            </div>
          )}

          {/* Stats grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              flex: 1,
            }}
          >
            <StatBox icon="📖" label="Lidos" value={stats?.lido || 0} color="#5a8a5a" />
            <StatBox icon="📚" label="Lendo" value={stats?.lendo || 0} color="#a08050" />
            <StatBox icon="⏳" label="Quero ler" value={stats?.nao_comecou || 0} color="#8a8580" />
            <StatBox icon="📄" label="Páginas" value={stats?.total_paginas_lidas.toLocaleString("pt-BR") || "0"} color="#8a6a9a" />
            <StatBox icon="✍️" label="Autores" value={stats?.autores_unicos || 0} color="#b07040" />
            <StatBox icon="🏷️" label="Gêneros" value={stats?.generos_unicos || 0} color="#a06080" />
          </div>

          {/* Footer with Instagram handle */}
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: "#2a2725" }}>
              @babelbookshelf
            </p>
            <p style={{ fontSize: 12, color: "#7a7570", marginTop: 4 }}>
              Acompanhe sua leitura no Babel 📚
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: number | string; color: string }) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.7)",
        borderRadius: 12,
        padding: 16,
        border: "1px solid rgba(42, 39, 37, 0.08)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          fontSize: 18,
        }}
      >
        {icon}
      </div>
      <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#2a2725" }}>{value}</p>
      <p style={{ fontSize: 12, color: "#7a7570", margin: 0 }}>{label}</p>
    </div>
  );
}

