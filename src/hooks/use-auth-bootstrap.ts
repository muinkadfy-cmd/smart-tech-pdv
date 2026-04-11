import { useEffect } from "react";
import { supabaseAuthService } from "@/services/auth/supabase-auth.service";

export function useAuthBootstrap() {
  useEffect(() => {
    void supabaseAuthService.bootstrap();
  }, []);
}
