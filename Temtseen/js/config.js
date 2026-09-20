/* ============================================================
   config.js — Cloud sync тохиргоо
   ⚠️ anon key нь НИЙТИЙН зориулалттай (RLS хамгаална)
   ============================================================ */

window.LEAGUE_CONFIG = {

  /* Supabase → Project Settings → API → Project URL
     ⚠️ /rest/v1/ НЭМЭХГҮЙ — supabase-js өөрөө нэмдэг.
     Буруу: https://xxx.supabase.co/rest/v1/
     Зөв:   https://xxx.supabase.co                                  */
  supabaseUrl: 'https://rsllkdbsjiqucmzdzydd.supabase.co',

  /* Supabase → Project Settings → API → anon public */
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzbGxrZGJzamlxdWNtemR6eWRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk3NjU2MzMsImV4cCI6MjEwNTM0MTYzM30.7IaT-EzVE-jOwabsq6MBPjLyk8ONKOHjUGn4anD5uLI',

  /* Лигийн ID — САНАМСАРГҮЙ, давтагдашгүй мөр.
     ⚠️ 'CHANGE-ME' гэсэн үг орсон бол sync БҮХЭЛДЭЭ УНТРАНА
        (data.js → syncEnabled() шалгалт).
     Дараах утга нь зөвхөн таны лигт зориулсан — өөр хүн таамаглахгүй. */
  leagueId: 'golomt-fl-main-k7x3m9q2z4'

};