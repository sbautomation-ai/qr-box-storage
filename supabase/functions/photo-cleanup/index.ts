import { json, serviceClient } from '../_shared/service.ts'

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const secret = Deno.env.get('PHOTO_CLEANUP_SECRET')
  if (!secret || request.headers.get('Authorization') !== `Bearer ${secret}`) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const db = serviceClient()
  const { error: reservationError } = await db.rpc('expire_missing_box_photos')
  if (reservationError) return json({ error: 'Could not expire photo reservations' }, 503)
  const { data: pending, error: queueError } = await db.from('photo_cleanup')
    .select('storage_path').order('queued_at').limit(100)
  if (queueError) return json({ error: 'Could not read the cleanup queue' }, 503)
  if (!pending.length) return json({ removed: 0 })

  const paths = pending.map((entry) => entry.storage_path)
  const { error: storageError } = await db.storage.from('box-photos').remove(paths)
  if (storageError) return json({ error: 'Storage cleanup will be retried' }, 503)
  const { error: deleteError } = await db.from('photo_cleanup').delete().in('storage_path', paths)
  if (deleteError) return json({ error: 'Could not acknowledge cleanup' }, 503)
  return json({ removed: paths.length })
})
