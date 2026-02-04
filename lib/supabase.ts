import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

// File upload helper
export async function uploadFile(
  file: File,
  bucket: string,
  folder: string = ''
): Promise<string | null> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.error('Supabase not configured')
      return null
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

// Delete file helper
export async function deleteFile(url: string, bucket: string): Promise<boolean> {
  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.error('Supabase not configured')
      return false
    }

    // Extract file path from URL
    const urlParts = url.split(`/${bucket}/`)
    if (urlParts.length < 2) return false
    
    const filePath = urlParts[1]
    
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}
