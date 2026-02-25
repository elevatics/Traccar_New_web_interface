import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, vehicleContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an AI Fleet Companion assistant specializing in vehicle management and fleet operations. You have access to the following vehicle data:

Vehicle Name: ${vehicleContext.name}
Plate Number: ${vehicleContext.plateNumber}
Driver: ${vehicleContext.driver}
Status: ${vehicleContext.status}
Speed: ${vehicleContext.speed} mph
Fuel Level: ${vehicleContext.fuel}%
Odometer: ${vehicleContext.odometer} mi
Location: ${vehicleContext.locationAddress}
Coordinates: ${vehicleContext.lat}, ${vehicleContext.lng}
Ignition: ${vehicleContext.ignition ? "On" : "Off"}
Motion: ${vehicleContext.motion ? "Yes" : "No"}
Altitude: ${vehicleContext.altitude} ft
Last Update: ${vehicleContext.lastUpdate}
Coolant Temp: ${vehicleContext.coolantTemp || "N/A"}°F
RPM: ${vehicleContext.rpm || "N/A"}
Fuel Consumption: ${vehicleContext.fuelConsumption}
Total Distance: ${vehicleContext.totalDistance} mi

Answer questions about this vehicle's status, health, maintenance needs, fuel efficiency, driving patterns, and provide actionable recommendations. Be concise and helpful. If asked about things unrelated to fleet/vehicle management, politely redirect to vehicle topics.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("vehicle-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
