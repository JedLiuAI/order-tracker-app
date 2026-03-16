'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrderAction } from "@/app/actions";

export function DeleteOrderButton({ contactNo }: { contactNo: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!window.confirm(`确定要删除联系单 ${contactNo} 吗？\n此操作不可恢复。`)) return;

    setIsDeleting(true);
    try {
      await deleteOrderAction(contactNo);
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("删除失败，请重试");
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={`btn secondary ${isDeleting ? "subtle" : ""}`}
      style={{ padding: "6px 12px", borderColor: "#fca5a5", color: "#dc2626", background: "#fef2f2" }}
      title="删除订单"
    >
      {isDeleting ? "删除中..." : "删除"}
    </button>
  );
}
