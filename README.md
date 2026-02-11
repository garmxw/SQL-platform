NOTES:

1-Database

    Database relations :
    users → submissions → problems → tracks
    users → user_progress → tracks
    users → badges (many-to-many)

    Foreign Keys enforce relationships between users → submissions → problems → tracks.

    CASCADE DELETE ensures cleanup if a user, problem, or track is removed.

    UNIQUE(user_id, track_id) in user_progress ensures one progress entry per user per track.

    Indexes improve query performance for common lookups (submissions, progress).
