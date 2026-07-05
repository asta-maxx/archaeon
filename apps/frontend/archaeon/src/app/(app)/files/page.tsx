"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { getFileContext } from "@/lib/api";
import type { FileContextResponse } from "@/lib/api";
import { FileInspector } from "@/components/files/FileInspector";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FilesPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContext, setFileContext] = useState<FileContextResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = useCallback(async (filePath: string) => {
    setSelectedFile(filePath);
    setLoading(true);
    setFileContext(null);
    setError(null);

    try {
      // Small delay for the "Archaeon is analysing" UX beat
      await new Promise((r) => setTimeout(r, 300));
      const ctx = await getFileContext("repo-1", filePath);
      setFileContext(ctx);
    } catch {
      setError("Failed to load file context. The backend may be unreachable — try enabling Demo Mode.");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-6 gap-3 sm:gap-4">
      {/* Header */}
      <div className="flex-shrink-0">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl font-semibold tracking-tight"
        >
          File Inspector
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xs sm:text-sm text-muted-foreground mt-1"
        >
          Open any file and instantly see why it exists — the author, the decision behind it, and what was rejected.
        </motion.p>
      </div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
          <p className="text-xs text-muted-foreground flex-1">{error}</p>
          {selectedFile && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1.5 flex-shrink-0"
              onClick={() => handleSelectFile(selectedFile)}
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </Button>
          )}
        </motion.div>
      )}

      {/* Inspector */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="flex-1 min-h-0"
      >
        <FileInspector
          repoId="repo-1"
          onSelectFile={handleSelectFile}
          selectedFile={selectedFile}
          fileContext={fileContext}
          loading={loading}
        />
      </motion.div>
    </div>
  );
}
