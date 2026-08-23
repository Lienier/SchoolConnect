/** File upload API helpers. */
import { apiClient } from "@/api/client";

export interface UploadedFile {
  id: string;
  filename: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  url: string | null;
  entity_type: string | null;
  entity_id: string | null;
}

export const uploadsApi = {
  async upload(
    file: File,
    target?: { entity_type?: "announcement" | "event"; entity_id?: string },
  ): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append("file", file);
    if (target?.entity_type) formData.append("entity_type", target.entity_type);
    if (target?.entity_id) formData.append("entity_id", target.entity_id);

    const { data } = await apiClient.post("/uploads", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  },
};
