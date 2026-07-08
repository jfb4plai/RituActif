// rituactif/supabase/functions/simplify-consigne-falc/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildAnthropicRequestBody, extractSimplifiedText } from "./logic.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SimplifyRequest {
  text: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text }: SimplifyRequest = await req.json();

    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({ error: "Texte manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Clé API manquante côté serveur" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(buildAnthropicRequestBody(text)),
    });

    if (!response.ok) {
      const err = await response.json();
      if (response.status === 529 || err.error?.type === "overloaded_error") {
        return new Response(
          JSON.stringify({ error: "API surchargée — réessayez dans quelques secondes." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: err.error?.message ?? "Erreur API Anthropic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const simplifiedText = extractSimplifiedText(data);

    return new Response(
      JSON.stringify({ simplifiedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error simplifying consigne:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
