export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_settings: {
        Row: {
          activity_name: string
          activity_type: string
          address: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          owner_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_name?: string
          activity_type?: string
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_name?: string
          activity_type?: string
          address?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          owner_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      export_audit_logs: {
        Row: {
          admin_phone: string | null
          admin_user_id: string
          created_at: string
          id: string
          periode_start: string | null
          query_text: string | null
          rows_count: number
          type_filter: string
        }
        Insert: {
          admin_phone?: string | null
          admin_user_id: string
          created_at?: string
          id?: string
          periode_start?: string | null
          query_text?: string | null
          rows_count?: number
          type_filter?: string
        }
        Update: {
          admin_phone?: string | null
          admin_user_id?: string
          created_at?: string
          id?: string
          periode_start?: string | null
          query_text?: string | null
          rows_count?: number
          type_filter?: string
        }
        Relationships: []
      }
      import_sessions: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          operations_extraites: Json | null
          statut: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          operations_extraites?: Json | null
          statut?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          operations_extraites?: Json | null
          statut?: string
          user_id?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          categorie: string
          created_at: string
          date_operation: string
          description: string
          id: string
          mode_paiement: string
          montant: number
          note: string | null
          recu_url: string | null
          source: Database["public"]["Enums"]["op_source"]
          type: Database["public"]["Enums"]["op_type"]
          user_id: string
        }
        Insert: {
          categorie: string
          created_at?: string
          date_operation?: string
          description: string
          id?: string
          mode_paiement: string
          montant: number
          note?: string | null
          recu_url?: string | null
          source?: Database["public"]["Enums"]["op_source"]
          type: Database["public"]["Enums"]["op_type"]
          user_id: string
        }
        Update: {
          categorie?: string
          created_at?: string
          date_operation?: string
          description?: string
          id?: string
          mode_paiement?: string
          montant?: number
          note?: string | null
          recu_url?: string | null
          source?: Database["public"]["Enums"]["op_source"]
          type?: Database["public"]["Enums"]["op_type"]
          user_id?: string
        }
        Relationships: []
      }
      produits: {
        Row: {
          actif: boolean
          categorie: string
          created_at: string
          id: string
          nom: string
          prix_unitaire: number
          unite: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actif?: boolean
          categorie?: string
          created_at?: string
          id?: string
          nom: string
          prix_unitaire?: number
          unite?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actif?: boolean
          categorie?: string
          created_at?: string
          id?: string
          nom?: string
          prix_unitaire?: number
          unite?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          export_unlocked_until: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          phone: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          export_unlocked_until?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          phone: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          export_unlocked_until?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      users_overview: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          roles: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "vendeur"
      op_source: "manuel" | "import_ia"
      op_type: "entree" | "sortie"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendeur"],
      op_source: ["manuel", "import_ia"],
      op_type: ["entree", "sortie"],
    },
  },
} as const
