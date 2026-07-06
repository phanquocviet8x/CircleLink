import { supabase, isDemoMode } from '../supabaseClient';

// Helper to generate UUIDs in local storage
const generateUUID = () => 'local-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();

// ==================== LOCAL STORAGE HELPERS (DEMO MODE) ====================
const getLocalEvents = () => {
    const data = localStorage.getItem('circlelink_events');
    return data ? JSON.parse(data) : {};
};

const saveLocalEvents = (events) => {
    localStorage.setItem('circlelink_events', JSON.stringify(events));
};

const getLocalAttendees = () => {
    const data = localStorage.getItem('circlelink_attendees');
    return data ? JSON.parse(data) : [];
};

const saveLocalAttendees = (attendees) => {
    localStorage.setItem('circlelink_attendees', JSON.stringify(attendees));
};

// ==================== UNIFIED SERVICE API ====================
export const eventService = {

    /**
     * Fetch an event by slug.
     * Slugs are only unique per calendar day (event_day), so two different
     * hosts can reuse the same event name on different dates. When more than
     * one row matches, resolve to the "active" one: prefer the soonest event
     * that hasn't expired yet (currently running or next upcoming); fall
     * back to the most recent one if everything matching has expired.
     */
    async getEvent(slug) {
        if (isDemoMode) {
            const events = getLocalEvents();
            // If the event doesn't exist, auto-create a default mock event to make testing seamless
            if (!events[slug]) {
                const now = new Date();
                const defaultEvent = {
                    id: 'event-mock-id-' + slug,
                    slug: slug,
                    title: slug === 'test-event' ? 'Tech Meetup #1: AI & Startup Innovation' : `Sự kiện: ${slug}`,
                    description: slug === 'test-event' ? 'Chia sẻ công nghệ, kết nối đầu tư và tìm kiếm cộng sự phát triển dự án.' : 'Chào mừng bạn tham gia sự kiện và kết nối vòng tròn quan hệ.',
                    is_checkin_open: true,
                    require_phone: false,
                    is_premium: false,
                    event_type: slug === 'test-event' ? 'hybrid' : 'offline',
                    meeting_link: slug === 'test-event' ? 'https://zoom.us/j/123456789' : '',
                    event_date: now.toISOString(),
                    duration_days: 7,
                    expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    created_at: now.toISOString()
                };
                events[slug] = defaultEvent;
                saveLocalEvents(events);
            }
            return { data: events[slug], error: null };
        } else {
            const { data, error } = await supabase
                .from('events_public')
                .select('*')
                .eq('slug', slug)
                .order('event_date', { ascending: true });

            if (error) return { data: null, error };
            if (!data || data.length === 0) return { data: null, error: null };

            const nowIso = new Date().toISOString();
            const notExpired = data.filter(e => !e.expires_at || e.expires_at > nowIso);
            const chosen = notExpired.length > 0 ? notExpired[0] : data[data.length - 1];
            return { data: chosen, error: null };
        }
    },

    /**
     * Create a new event.
     * eventDate (ISO string / Date) and durationDays (1, 3, 7 or 30) are
     * required: they let the same event name be reused on a different date
     * (uniqueness is scoped to slug + calendar day) and define how long the
     * event's link and data stay alive before automatic cleanup.
     */
    async createEvent(slug, title, description, hostEmail = null, eventType = 'offline', meetingLink = '', eventDate = null, durationDays = 7) {
        if (isDemoMode) {
            const events = getLocalEvents();
            const eventDayKey = (eventDate ? new Date(eventDate) : new Date()).toISOString().slice(0, 10);
            const existing = events[slug];
            const existingDayKey = existing?.event_date ? new Date(existing.event_date).toISOString().slice(0, 10) : null;
            if (existing && existingDayKey === eventDayKey) {
                return { data: null, error: { message: "SLUG_DATE_TAKEN" } };
            }
            const resolvedDate = eventDate ? new Date(eventDate) : new Date();
            const resolvedDuration = durationDays || 7;
            const newEvent = {
                id: 'event-' + generateUUID(),
                slug,
                title,
                description,
                host_email: hostEmail,
                is_checkin_open: true,
                require_phone: false,
                is_premium: false,
                event_type: eventType,
                meeting_link: meetingLink,
                event_date: resolvedDate.toISOString(),
                duration_days: resolvedDuration,
                expires_at: new Date(resolvedDate.getTime() + resolvedDuration * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString()
            };
            // Demo mode keys events by slug only; a later same-day check above
            // prevents accidental overwrite, different days simply replace the
            // single demo slot (local storage isn't meant to model this fully).
            events[slug] = newEvent;
            saveLocalEvents(events);
            return { data: newEvent, error: null };
        } else {
            const { data, error } = await supabase
                .rpc('create_event', {
                    p_slug: slug,
                    p_title: title,
                    p_description: description,
                    p_host_email: hostEmail,
                    p_event_type: eventType,
                    p_meeting_link: meetingLink,
                    p_event_date: eventDate ? new Date(eventDate).toISOString() : null,
                    p_duration_days: durationDays
                });
            return { data, error };
        }
    },

    /**
     * Get the event currently hosted by the logged-in host (1 event per email).
     * Returns { data: event | null }.
     */
    async getMyHostedEvent(hostEmail = null) {
        if (isDemoMode) {
            const events = getLocalEvents();
            const mine = Object.values(events)
                .filter(e => e && e.host_email && hostEmail && e.host_email.toLowerCase() === hostEmail.toLowerCase())
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return { data: mine[0] || null, error: null };
        } else {
            const { data, error } = await supabase.rpc('get_my_hosted_event');
            // RPC returns a set; normalize to a single row or null
            const row = Array.isArray(data) ? (data[0] || null) : (data || null);
            return { data: row, error };
        }
    },

    /**
     * Update event configuration (Title, Desc, Check-in Gate, Phone Required)
     */
    async updateEvent(slug, updates) {
        if (isDemoMode) {
            const events = getLocalEvents();
            if (!events[slug]) {
                return { data: null, error: { message: "Event not found." } };
            }
            events[slug] = { ...events[slug], ...updates };
            saveLocalEvents(events);
            
            // Dispatch a local event to let other windows know the event configuration updated
            window.dispatchEvent(new CustomEvent('circlelink-realtime-event-update', { 
                detail: events[slug] 
            }));
            
            return { data: events[slug], error: null };
        } else {
            const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
            const { data, error } = await supabase
                .rpc('admin_update_event', {
                    p_slug: slug,
                    p_token: token,
                    p_title: updates.title !== undefined ? updates.title : null,
                    p_description: updates.description !== undefined ? updates.description : null,
                    p_is_checkin_open: updates.is_checkin_open !== undefined ? updates.is_checkin_open : null,
                    p_require_phone: updates.require_phone !== undefined ? updates.require_phone : null,
                    p_is_premium: updates.is_premium !== undefined ? updates.is_premium : null,
                    p_event_type: updates.event_type !== undefined ? updates.event_type : null,
                    p_meeting_link: updates.meeting_link !== undefined ? updates.meeting_link : null
                });
            return { data, error };
        }
    },

    /**
     * Get all attendees for a specific event
     */
    async getAttendees(eventId) {
        if (isDemoMode) {
            const attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.event_id === eventId);
            // Sort by creation date descending
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return { data: filtered, error: null };
        } else {
            const { data, error } = await supabase
                .from('attendees_public')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });
            return { data, error };
        }
    },

    /**
     * Get all attendees with contacts (for host admin dashboard)
     */
    async adminGetAttendees(eventId, slug) {
        if (isDemoMode) {
            const attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.event_id === eventId);
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            return { data: filtered, error: null };
        } else {
            const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
            const { data, error } = await supabase
                .rpc('admin_get_attendees', {
                    p_event_id: eventId,
                    p_slug: slug,
                    p_token: token
                });
            return { data, error };
        }
    },

    /**
     * Add a new attendee check-in
     */
    async addAttendee(eventId, attendeeData, slug) {
        try {
            if (isDemoMode) {
                const events = getLocalEvents() || {};
                const event = Object.values(events).find(e => e && e.id === eventId);
                const attendees = getLocalAttendees() || [];
                const filtered = attendees.filter(a => a && a.event_id === eventId);
                
                if (event && !event.is_premium && filtered.length >= 50) {
                    return { data: null, error: { message: "LIMIT_EXCEEDED" } };
                }

                const newAttendee = {
                    id: 'guest-' + generateUUID(),
                    event_id: eventId,
                    ...attendeeData,
                    created_at: new Date().toISOString()
                };
                attendees.push(newAttendee);
                saveLocalAttendees(attendees);
                
                // Dispatch dynamic window event for real-time tab syncing
                window.dispatchEvent(new CustomEvent('circlelink-realtime-insert', { 
                    detail: newAttendee 
                }));
                
                return { data: newAttendee, error: null };
            } else {
                const { data, error } = await supabase
                    .rpc('checkin_attendee', {
                        p_event_id: eventId,
                        p_name: attendeeData.name,
                        p_role: attendeeData.role,
                        p_bio: attendeeData.bio || '',
                        p_avatar: attendeeData.avatar || 'avatar-1',
                        p_looking: attendeeData.looking || 'Không chia sẻ cụ thể.',
                        p_help: attendeeData.help || 'Không chia sẻ cụ thể.',
                        p_contacts: attendeeData.contacts || {},
                        p_privacy: attendeeData.privacy || {}
                    });
                // Persist the ownership secret so this device can later edit/delete its own profile
                if (!error && data && data.edit_token && slug) {
                    localStorage.setItem(`circlelink_attendee_token_${slug}`, data.edit_token);
                }
                return { data, error };
            }
        } catch (err) {
            console.error("Error in addAttendee:", err);
            return { data: null, error: { message: err.message || "Unknown error" } };
        }
    },

    /**
     * Get a single attendee by ID
     */
    async getAttendee(attendeeId, slug) {
        if (isDemoMode) {
            const attendees = getLocalAttendees() || [];
            const attendee = attendees.find(a => a && a.id === attendeeId);
            return { data: attendee || null, error: attendee ? null : { message: "Attendee not found." } };
        } else {
            const editToken = localStorage.getItem(`circlelink_attendee_token_${slug}`);
            const { data, error } = await supabase
                .rpc('get_attendee_self', {
                    p_attendee_id: attendeeId,
                    p_edit_token: editToken
                });
            return { data, error };
        }
    },

    /**
     * Update attendee profile
     */
    async updateAttendee(attendeeId, attendeeData, slug) {
        try {
            if (isDemoMode) {
                let attendees = getLocalAttendees() || [];
                const idx = attendees.findIndex(a => a && a.id === attendeeId);
                if (idx === -1) {
                    return { data: null, error: { message: "Attendee not found." } };
                }
                const updatedAttendee = {
                    ...attendees[idx],
                    ...attendeeData
                };
                attendees[idx] = updatedAttendee;
                saveLocalAttendees(attendees);
                
                // Dispatch dynamic window event for real-time tab syncing
                window.dispatchEvent(new CustomEvent('circlelink-realtime-update', { 
                    detail: updatedAttendee 
                }));
                
                return { data: updatedAttendee, error: null };
            } else {
                const editToken = localStorage.getItem(`circlelink_attendee_token_${slug}`);
                const { data, error } = await supabase
                    .rpc('update_attendee_self', {
                        p_attendee_id: attendeeId,
                        p_edit_token: editToken,
                        p_data: attendeeData
                    });
                return { data, error };
            }
        } catch (err) {
            console.error("Error in updateAttendee:", err);
            return { data: null, error: { message: err.message || "Unknown error" } };
        }
    },

    /**
     * Kick an attendee from the event
     */
    async kickAttendee(attendeeId, slug) {
        if (isDemoMode) {
            let attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.id !== attendeeId);
            saveLocalAttendees(filtered);
            
            // Dispatch event for real-time tab syncing
            window.dispatchEvent(new CustomEvent('circlelink-realtime-delete', { 
                detail: { id: attendeeId } 
            }));
            
            return { error: null };
        } else {
            const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
            const { error } = await supabase
                .rpc('admin_kick_attendee', {
                    p_attendee_id: attendeeId,
                    p_slug: slug,
                    p_token: token
                });
            return { error };
        }
    },

    /**
     * Delete all attendees in an event
     */
    async resetEvent(eventId, slug) {
        if (isDemoMode) {
            let attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.event_id !== eventId);
            saveLocalAttendees(filtered);
            
            window.dispatchEvent(new CustomEvent('circlelink-realtime-reset', { 
                detail: { event_id: eventId } 
            }));
            
            return { error: null };
        } else {
            const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
            const { error } = await supabase
                .rpc('admin_reset_event', {
                    p_event_id: eventId,
                    p_slug: slug,
                    p_token: token
                });
            return { error };
        }
    },

    /**
     * Verify if the admin token is valid for a given event slug
     */
    async verifyAdminToken(slug, token) {
        if (isDemoMode) {
            return { isValid: true, error: null };
        } else {
            const { data, error } = await supabase
                .rpc('admin_update_event', {
                    p_slug: slug,
                    p_token: token
                });
            return { isValid: !error, error };
        }
    },

    /**
     * Delete attendee profile directly (user self-delete)
     */
    async deleteAttendeeDirect(attendeeId, slug) {
        if (isDemoMode) {
            let attendees = getLocalAttendees();
            const filtered = attendees.filter(a => a.id !== attendeeId);
            saveLocalAttendees(filtered);

            // Dispatch event for real-time tab syncing
            window.dispatchEvent(new CustomEvent('circlelink-realtime-delete', {
                detail: { id: attendeeId }
            }));
            return { error: null };
        } else {
            const editToken = localStorage.getItem(`circlelink_attendee_token_${slug}`);
            const { error } = await supabase
                .rpc('delete_attendee_self', {
                    p_attendee_id: attendeeId,
                    p_edit_token: editToken
                });
            return { error };
        }
    },

    /**
     * Delete entire event (host deletes event)
     */
    async deleteEvent(slug) {
        if (isDemoMode) {
            const events = getLocalEvents();
            const eventObj = events[slug];
            if (eventObj) {
                let attendees = getLocalAttendees();
                const filteredAttendees = attendees.filter(a => a.event_id !== eventObj.id);
                saveLocalAttendees(filteredAttendees);
            }
            delete events[slug];
            saveLocalEvents(events);
            return { error: null };
        } else {
            const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
            const { error } = await supabase
                .rpc('admin_delete_event', {
                    p_slug: slug,
                    p_token: token
                });
            return { error };
        }
    },

    /**
     * Get contact details for a specific attendee (guest-to-guest)
     */
    async getAttendeeContact(attendeeId, eventId, slug) {
        if (isDemoMode) {
            const attendees = getLocalAttendees() || [];
            const attendee = attendees.find(a => a && a.id === attendeeId);
            if (!attendee) return { data: null, error: { message: "Attendee not found" } };
            return { data: attendee.contacts || {}, error: null };
        } else {
            const requesterId = localStorage.getItem(`circlelink_attendee_id_${slug}`);
            const { data, error } = await supabase
                .rpc('get_attendee_contact', {
                    p_attendee_id: attendeeId,
                    p_event_id: eventId,
                    p_requester_id: requesterId || null
                });
            return { data, error };
        }
    },

    /**
     * Subscribe to real-time additions and removals of attendees
     */
    subscribeToAttendees(eventId, onInsert, onDelete, onReset, onEventUpdate, onUpdateAttendee) {
        if (isDemoMode) {
            // Local listeners for tab-to-tab sync
            const handleInsert = (e) => {
                if (e.detail.event_id === eventId) {
                    onInsert(e.detail);
                }
            };
            
            const handleDelete = (e) => {
                onDelete(e.detail.id);
            };
            
            const handleReset = (e) => {
                if (e.detail.event_id === eventId) {
                    onReset();
                }
            };

            const handleEventUpdate = (e) => {
                if (e.detail.id === eventId && onEventUpdate) {
                    onEventUpdate(e.detail);
                }
            };

            const handleUpdate = (e) => {
                if (e.detail.event_id === eventId && onUpdateAttendee) {
                    onUpdateAttendee(e.detail);
                }
            };
            
            window.addEventListener('circlelink-realtime-insert', handleInsert);
            window.addEventListener('circlelink-realtime-delete', handleDelete);
            window.addEventListener('circlelink-realtime-reset', handleReset);
            window.addEventListener('circlelink-realtime-event-update', handleEventUpdate);
            window.addEventListener('circlelink-realtime-update', handleUpdate);
            
            // Return unsubscribe function
            return () => {
                window.removeEventListener('circlelink-realtime-insert', handleInsert);
                window.removeEventListener('circlelink-realtime-delete', handleDelete);
                window.removeEventListener('circlelink-realtime-reset', handleReset);
                window.removeEventListener('circlelink-realtime-event-update', handleEventUpdate);
                window.removeEventListener('circlelink-realtime-update', handleUpdate);
            };
        } else {
            // Supabase Database Channel Subscription
            const channel = supabase
                .channel(`event-realtime-${eventId}`)
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'attendees', 
                    filter: `event_id=eq.${eventId}` 
                }, payload => {
                    onInsert(payload.new);
                })
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'attendees', 
                    filter: `event_id=eq.${eventId}` 
                }, payload => {
                    if (onUpdateAttendee) {
                        onUpdateAttendee(payload.new);
                    }
                })
                .on('postgres_changes', { 
                    event: 'DELETE', 
                    schema: 'public', 
                    table: 'attendees'
                    // Note: delete filter by foreign key eq isn't fully supported in some PG versions,
                    // we handle checking the kicked ID in the callback or reload
                }, payload => {
                    // payload.old will contain the ID of the deleted row
                    if (payload.old && payload.old.id) {
                        onDelete(payload.old.id);
                    }
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'events',
                    filter: `id=eq.${eventId}`
                }, payload => {
                    if (onEventUpdate) {
                        onEventUpdate(payload.new);
                    }
                });

            channel.subscribe();
            
            return () => {
                supabase.removeChannel(channel);
            };
        }
    },

    /**
     * Rotate the host admin token (invalidates any previously shared token)
     */
    async rotateAdminToken(slug) {
        if (isDemoMode) {
            return { data: 'demo-token', error: null };
        }
        const token = localStorage.getItem(`circlelink_admin_token_${slug}`);
        const { data, error } = await supabase
            .rpc('admin_regenerate_token', { p_slug: slug, p_token: token });
        if (!error && data) {
            localStorage.setItem(`circlelink_admin_token_${slug}`, data);
        }
        return { data, error };
    },

    /**
     * Sign in with Google OAuth
     */
    async signInWithGoogle() {
        if (isDemoMode) {
            alert("Auth is not available in Demo Mode. Set your Supabase keys to test Google OAuth.");
            return { error: { message: "Demo mode" } };
        }
        return await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
    },

    /**
     * Sign out the current host
     */
    async signOut() {
        if (!isDemoMode) {
            await supabase.auth.signOut();
        }
        localStorage.removeItem('circlelink_host_email');
    }
};
