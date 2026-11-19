import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SpotifyTokenCache {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: SpotifyTokenCache | null = null;

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.accessToken;
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn('Erreur récupération token Spotify:', await res.text());
      return null;
    }

    const data = await res.json();
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    return cachedToken.accessToken;
  } catch (err) {
    console.warn('Exception obtention token Spotify:', err);
    return null;
  }
}

// Suggestions d'exemples de classiques mariage en fallback si Spotify n'est pas configuré
const FALLBACK_CLASSICS = [
  {
    title: 'At Last',
    artist: 'Etta James',
    spotify_id: 'mock-etta-james-at-last',
    preview_url: null,
    cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    duration_ms: 180000,
  },
  {
    title: 'Can’t Take My Eyes Off You',
    artist: 'Frankie Valli',
    spotify_id: 'mock-frankie-valli',
    preview_url: null,
    cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
    duration_ms: 202000,
  },
  {
    title: 'Perfect',
    artist: 'Ed Sheeran',
    spotify_id: 'mock-ed-sheeran-perfect',
    preview_url: null,
    cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
    duration_ms: 263000,
  },
  {
    title: 'Fly Me to the Moon',
    artist: 'Frank Sinatra',
    spotify_id: 'mock-sinatra-fly-me',
    preview_url: null,
    cover_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80',
    duration_ms: 147000,
  },
  {
    title: 'September',
    artist: 'Earth, Wind & Fire',
    spotify_id: 'mock-ewf-september',
    preview_url: null,
    cover_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=400&q=80',
    duration_ms: 215000,
  },
  {
    title: 'L-O-V-E',
    artist: 'Nat King Cole',
    spotify_id: 'mock-nat-king-cole-love',
    preview_url: null,
    cover_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    duration_ms: 155000,
  },
  {
    title: 'La vie en rose',
    artist: 'Édith Piaf',
    spotify_id: 'mock-edith-piaf-vie-en-rose',
    preview_url: null,
    cover_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
    duration_ms: 185000,
  },
  {
    title: 'Ain’t No Mountain High Enough',
    artist: 'Marvin Gaye, Tammi Terrell',
    spotify_id: 'mock-marvin-gaye-mountain',
    preview_url: null,
    cover_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=80',
    duration_ms: 151000,
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (!q) {
    return NextResponse.json({ tracks: [] });
  }

  const token = await getSpotifyAccessToken();

  if (token) {
    try {
      const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        q
      )}&type=track&limit=10&market=FR`;

      const res = await fetch(spotifyUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.tracks?.items || [];

        const tracks = items.map((item: any) => ({
          title: item.name,
          artist: item.artists?.map((a: any) => a.name).join(', ') ?? 'Artiste inconnu',
          spotify_id: item.id,
          preview_url: item.preview_url ?? null,
          cover_url: item.album?.images?.[0]?.url || item.album?.images?.[1]?.url || null,
          duration_ms: item.duration_ms ?? 0,
        }));

        return NextResponse.json({ tracks });
      }
    } catch (err) {
      console.warn('Erreur appel Spotify search:', err);
    }
  }

  // Fallback si pas de token ou erreur Spotify
  const filtered = FALLBACK_CLASSICS.filter(
    (item) =>
      item.title.toLowerCase().includes(q.toLowerCase()) ||
      item.artist.toLowerCase().includes(q.toLowerCase())
  );

  return NextResponse.json({
    tracks: filtered.length > 0 ? filtered : [
      {
        title: q,
        artist: 'Morceau personnalisé',
        spotify_id: null,
        preview_url: null,
        cover_url: null,
        duration_ms: 0,
      },
    ],
  });
}
