import { supabase } from "./supabase-client.js";

export async function checkInstallation() {
  const { data, error } = await supabase.from("instalacion").select("*").single();

  if (error && error.code === "PGRST116") {
    window.location.href = "/crear-jefe.html";
    return;
  }

  if (error) {
    console.error("Error leyendo instalación:", error);
    return;
  }

  if (data.first_run === true) {
    window.location.href = "/crear-jefe.html";
    return;
  }

  return true;
}
