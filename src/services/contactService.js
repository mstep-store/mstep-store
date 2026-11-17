import { supabase } from "./supabase";

export async function sendContactMessage({ name, email, phone, message }) {
    const { error } = await supabase.from("contact_messages").insert({
        name: name.trim(),
        email: email.trim(),
        phone: phone?.trim() || null,
        message: message.trim(),
    });

    if (error) {
        throw error;
    }
}

export async function getContactMessages() {
    const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return data ?? [];
}

export async function setMessageRead(id, isRead) {
    const { error } = await supabase
        .from("contact_messages")
        .update({ is_read: isRead })
        .eq("id", id);

    if (error) {
        throw error;
    }
}

export async function deleteContactMessage(id) {
    const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id);

    if (error) {
        throw error;
    }
}
