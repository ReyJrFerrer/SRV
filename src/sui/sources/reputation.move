#[allow(unused_const, duplicate_alias, lint(self_transfer))]
module srv_reputation::reputation {
    use std::string::{Self, String};
    use std::vector;
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext, sender};

    const BASE_SCORE: u64 = 5000;
    const MAX_BOOKING_POINTS: u64 = 2000;
    const MAX_AGE_POINTS: u64 = 1000;
    const MIN_TRUST_SCORE: u64 = 0;
    const MAX_TRUST_SCORE: u64 = 10000;
    const CANCELLATION_PENALTY: u64 = 500;

    const BAYESIAN_CONFIDENCE_THRESHOLD: u64 = 200;
    const BAYESIAN_PRIOR_MEAN: u64 = 300;
    const MAX_REVIEW_WEIGHT: u64 = 200;
    const MIN_REVIEW_WEIGHT: u64 = 10;
    const REVIEW_AGE_HALFLIFE_DAYS_NS: u64 = 15552000000000000;
    const RECENCY_WEIGHT: u64 = 30;
    const CONSISTENCY_BONUS: u64 = 500;
    const ACTIVITY_FREQUENCY_WEIGHT: u64 = 10;

    const THRESHOLD_LOW: u64 = 2000;
    const THRESHOLD_MEDIUM: u64 = 5000;
    const THRESHOLD_HIGH: u64 = 8000;
    const THRESHOLD_VERY_HIGH: u64 = 10000;

    const TRUST_LEVEL_NEW: u8 = 0;
    const TRUST_LEVEL_LOW: u8 = 1;
    const TRUST_LEVEL_MEDIUM: u8 = 2;
    const TRUST_LEVEL_HIGH: u8 = 3;
    const TRUST_LEVEL_VERY_HIGH: u8 = 4;

    const FLAG_REVIEW_BOMB: u8 = 0;
    const FLAG_COMPETITIVE_MANIPULATION: u8 = 1;
    const FLAG_FAKE_EVIDENCE: u8 = 2;
    const FLAG_IDENTITY_FRAUD: u8 = 3;
    const FLAG_ABUSIVE_CONTENT: u8 = 4;
    const FLAG_OTHER: u8 = 5;

    const REVIEW_STATUS_VISIBLE: u8 = 0;
    const REVIEW_STATUS_HIDDEN: u8 = 1;
    const REVIEW_STATUS_FLAGGED: u8 = 2;

    // ============ Data Structures ============

    public struct TrustLevelCounts has store, drop, copy {
        new_count: u64,
        low_count: u64,
        medium_count: u64,
        high_count: u64,
        very_high_count: u64,
    }

    public struct ReputationRegistry has key {
        id: UID,
        admin: address,
        total_users: u64,
        total_trust_score: u128,
        trust_level_counts: TrustLevelCounts,
    }

    public struct ReputationScore has key, store {
        id: UID,
        user: address,
        trust_score: u64,
        trust_level: u8,
        completed_bookings: u64,
        total_bookings: u64,
        rating_sum: u64,
        rating_count: u64,
        detection_flags: vector<u8>,
        created_at: u64,
        updated_at: u64,
    }

    public struct Review has store, drop {
        id: String,
        booking_id: String,
        client_id: address,
        provider_id: address,
        service_id: String,
        rating: u64,
        comment: String,
        status: u8,
        quality_score: u64,
        created_at: u64,
    }

    public struct ReviewStore has key {
        id: UID,
        reviews: vector<Review>,
    }

    public struct ReputationHistory has store, drop {
        trust_score: u64,
        trust_level: u8,
        timestamp: u64,
    }

    public struct HistoryStore has key {
        id: UID,
        user: address,
        entries: vector<ReputationHistory>,
    }

    // ============ Helper Functions ============

    public fun determine_trust_level(trust_score: u64): u8 {
        if (trust_score <= THRESHOLD_LOW) {
            TRUST_LEVEL_NEW
        } else if (trust_score <= THRESHOLD_MEDIUM) {
            TRUST_LEVEL_LOW
        } else if (trust_score <= THRESHOLD_HIGH) {
            TRUST_LEVEL_MEDIUM
        } else if (trust_score <= THRESHOLD_VERY_HIGH) {
            TRUST_LEVEL_HIGH
        } else {
            TRUST_LEVEL_VERY_HIGH
        }
    }

    public fun clamp_score(score: u64): u64 {
        if (score < MIN_TRUST_SCORE) {
            MIN_TRUST_SCORE
        } else if (score > MAX_TRUST_SCORE) {
            MAX_TRUST_SCORE
        } else {
            score
        }
    }

    fun bytes_contains(haystack: &vector<u8>, needle: &vector<u8>): bool {
        let haystack_len = vector::length(haystack);
        let needle_len = vector::length(needle);
        if (needle_len == 0) {
            return true
        };
        if (needle_len > haystack_len) {
            return false
        };
        let mut i = 0;
        while (i <= haystack_len - needle_len) {
            let mut j = 0;
            let mut found = true;
            while (j < needle_len) {
                if (*vector::borrow(haystack, i + j) != *vector::borrow(needle, j)) {
                    found = false;
                    break
                };
                j = j + 1;
            };
            if (found) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun contains_abusive_keyword(text: &vector<u8>): bool {
        let keywords = vector[
            b"scam", b"fraud", b"thief", b"stole", b"liar",
            b"idiot", b"stupid", b"fuck", b"shit", b"asshole",
            b"bitch", b"damn", b"hell", b"crap"
        ];
        let mut i = 0;
        let len = vector::length(&keywords);
        while (i < len) {
            if (bytes_contains(text, vector::borrow(&keywords, i))) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun string_to_bytes(s: &String): vector<u8> {
        *string::as_bytes(s)
    }

    public fun analyze_review(comment: &String, rating: u64): vector<u8> {
        let mut flags = vector::empty<u8>();
        let text_bytes = string_to_bytes(comment);

        if (contains_abusive_keyword(&text_bytes)) {
            vector::push_back(&mut flags, FLAG_ABUSIVE_CONTENT);
        };

        if (rating <= 100 && string::length(comment) == 0) {
            vector::push_back(&mut flags, FLAG_FAKE_EVIDENCE);
        };

        if (rating > 500) {
            vector::push_back(&mut flags, FLAG_OTHER);
        };

        flags
    }

    public fun calculate_sentiment(text: &String): u64 {
        let text_bytes = string_to_bytes(text);
        let mut score: u64 = 300;

        let positive = vector[b"great", b"excellent", b"amazing", b"good", b"wonderful", b"fantastic", b"love", b"best", b"perfect", b"recommend"];
        let mut i = 0;
        while (i < vector::length(&positive)) {
            if (bytes_contains(&text_bytes, vector::borrow(&positive, i))) {
                score = score + 50;
            };
            i = i + 1;
        };

        let negative = vector[b"bad", b"terrible", b"awful", b"worst", b"hate", b"disappointing", b"poor", b"horrible", b"avoid", b"scam"];
        let mut j = 0;
        while (j < vector::length(&negative)) {
            if (bytes_contains(&text_bytes, vector::borrow(&negative, j))) {
                if (score >= 50) {
                    score = score - 50;
                } else {
                    score = 0;
                };
            };
            j = j + 1;
        };

        if (score < 100) { 100 } else if (score > 500) { 500 } else { score }
    }

    public fun calculate_bayesian_average(current_average: u64, count: u64): u64 {
        if (count == 0) {
            return BAYESIAN_PRIOR_MEAN
        };
        let total = (count * current_average) + (BAYESIAN_CONFIDENCE_THRESHOLD * BAYESIAN_PRIOR_MEAN);
        let divisor = count + BAYESIAN_CONFIDENCE_THRESHOLD;
        if (divisor == 0) {
            return BAYESIAN_PRIOR_MEAN
        };
        total / divisor
    }

    public fun calculate_review_weight(_reviewer_trust_score: u64, trust_level: u8, quality_score: u64, review_age_ns: u64): u64 {
        let mut base_weight = MIN_REVIEW_WEIGHT;

        if (trust_level >= TRUST_LEVEL_HIGH) {
            base_weight = base_weight + 100;
        } else if (trust_level >= TRUST_LEVEL_MEDIUM) {
            base_weight = base_weight + 50;
        };

        base_weight = base_weight + (quality_score / 10);

        if (review_age_ns > 0) {
            let halflives = review_age_ns / REVIEW_AGE_HALFLIFE_DAYS_NS;
            if (halflives > 0) {
                let mut decay_factor: u64 = 1000;
                let mut k = 0;
                while (k < halflives && decay_factor > 100) {
                    decay_factor = decay_factor / 2;
                    k = k + 1;
                };
                base_weight = (base_weight * decay_factor) / 1000;
            }
        };

        if (base_weight < MIN_REVIEW_WEIGHT) { MIN_REVIEW_WEIGHT }
        else if (base_weight > MAX_REVIEW_WEIGHT) { MAX_REVIEW_WEIGHT }
        else { base_weight }
    }

    public fun calculate_recency(completed_bookings: u64, account_age_ns: u64): u64 {
        if (completed_bookings == 0) {
            return 0
        };

        let mut points = 0;
        let thirty_days: u64 = 2592000000000000;
        let ninety_days: u64 = 7776000000000000;
        let one_eighty_days: u64 = 15552000000000000;

        if (account_age_ns <= thirty_days && completed_bookings >= 1) {
            points = points + MAX_BOOKING_POINTS;
        } else if (account_age_ns <= ninety_days && completed_bookings >= 2) {
            points = points + (MAX_BOOKING_POINTS * 2) / 3;
        } else if (account_age_ns <= one_eighty_days && completed_bookings >= 3) {
            points = points + MAX_BOOKING_POINTS / 3;
        };

        points
    }

    public fun calculate_activity_freq(completed_bookings: u64, account_age_ns: u64): u64 {
        if (completed_bookings == 0 || account_age_ns == 0) {
            return 0
        };

        let one_month: u64 = 2592000000000000;
        let mut months = account_age_ns / one_month;
        if (months == 0) { months = 1; };

        let mut bookings_per_month = (completed_bookings * 1000) / months;
        if (bookings_per_month > MAX_BOOKING_POINTS) { bookings_per_month = MAX_BOOKING_POINTS; };

        (bookings_per_month * ACTIVITY_FREQUENCY_WEIGHT) / 10
    }

    public fun calculate_trust_score_client(
        completed_bookings: u64,
        total_bookings: u64,
        average_rating: u64,
        account_age_ns: u64,
        detection_flags_len: u64
    ): u64 {
        let mut score = BASE_SCORE;

        if (total_bookings > 0) {
            // Safe calculation to avoid overflow with large numbers
            let booking_points = (completed_bookings * MAX_BOOKING_POINTS) / total_bookings;
            score = score + booking_points;
        };

        let rating_points = (average_rating * 3000) / 500;
        score = score + rating_points;

        let recency_points = calculate_recency(completed_bookings, account_age_ns);
        score = score + recency_points;

        let freq_points = calculate_activity_freq(completed_bookings, account_age_ns);
        score = score + freq_points;

        let penalty = detection_flags_len * 500;
        if (penalty > score) {
            score = 0
        } else {
            score = score - penalty;
        };

        clamp_score(score)
    }

    public fun calculate_trust_provider(
        completed_bookings: u64,
        total_bookings: u64,
        average_rating: u64,
        account_age_ns: u64,
        detection_flags_len: u64
    ): u64 {
        let mut score = BASE_SCORE + 500;

        if (total_bookings > 0) {
            // Safe calculation to avoid overflow with large numbers
            let booking_points = (completed_bookings * MAX_BOOKING_POINTS * 12) / (total_bookings * 10);
            score = score + booking_points;
        };

        let rating_points = (average_rating * 3000) / 500;
        score = score + rating_points;

        let recency_points = calculate_recency(completed_bookings, account_age_ns);
        score = score + recency_points;

        let freq_points = calculate_activity_freq(completed_bookings, account_age_ns);
        score = score + freq_points;

        if (completed_bookings >= 10) {
            score = score + 500;
        } else if (completed_bookings >= 5) {
            score = score + 250;
        };

        let penalty = detection_flags_len * 500;
        if (penalty > score) {
            score = 0
        } else {
            score = score - penalty;
        };

        clamp_score(score)
    }

    fun update_counts(cnts: &mut TrustLevelCounts, old_lvl: u8, new_lvl: u8) {
        if (old_lvl == TRUST_LEVEL_NEW) { cnts.new_count = cnts.new_count - 1; }
        else if (old_lvl == TRUST_LEVEL_LOW) { cnts.low_count = cnts.low_count - 1; }
        else if (old_lvl == TRUST_LEVEL_MEDIUM) { cnts.medium_count = cnts.medium_count - 1; }
        else if (old_lvl == TRUST_LEVEL_HIGH) { cnts.high_count = cnts.high_count - 1; }
        else if (old_lvl == TRUST_LEVEL_VERY_HIGH) { cnts.very_high_count = cnts.very_high_count - 1; };

        if (new_lvl == TRUST_LEVEL_NEW) { cnts.new_count = cnts.new_count + 1; }
        else if (new_lvl == TRUST_LEVEL_LOW) { cnts.low_count = cnts.low_count + 1; }
        else if (new_lvl == TRUST_LEVEL_MEDIUM) { cnts.medium_count = cnts.medium_count + 1; }
        else if (new_lvl == TRUST_LEVEL_HIGH) { cnts.high_count = cnts.high_count + 1; }
        else if (new_lvl == TRUST_LEVEL_VERY_HIGH) { cnts.very_high_count = cnts.very_high_count + 1; };
    }

    fun update_registry_totals(registry: &mut ReputationRegistry, old_score: u64, new_score: u64, old_level: u8, new_level: u8) {
        if (old_level != new_level) {
            update_counts(&mut registry.trust_level_counts, old_level, new_level);
        };

        if (new_score >= old_score) {
            let diff = (new_score - old_score) as u128;
            registry.total_trust_score = registry.total_trust_score + diff;
        } else {
            let diff = (old_score - new_score) as u128;
            if (registry.total_trust_score >= diff) {
                registry.total_trust_score = registry.total_trust_score - diff;
            } else {
                registry.total_trust_score = 0;
            };
        };
    }

    // ============ Public Functions ============

    public fun initialize_registry(ctx: &mut TxContext) {
        let registry = ReputationRegistry {
            id: object::new(ctx),
            admin: sender(ctx),
            total_users: 0,
            total_trust_score: 0,
            trust_level_counts: TrustLevelCounts {
                new_count: 0, low_count: 0, medium_count: 0, high_count: 0, very_high_count: 0,
            },
        };
        transfer::share_object(registry);
    }

    public fun initialize_reputation(
        registry: &mut ReputationRegistry,
        ctx: &mut TxContext
    ): ID {
        let user = sender(ctx);

        let score = ReputationScore {
            id: object::new(ctx),
            user: user,
            trust_score: BASE_SCORE,
            trust_level: TRUST_LEVEL_NEW,
            completed_bookings: 0,
            total_bookings: 0,
            rating_sum: 0,
            rating_count: 0,
            detection_flags: vector::empty<u8>(),
            created_at: tx_context::epoch(ctx),
            updated_at: tx_context::epoch(ctx),
        };

        registry.total_users = registry.total_users + 1;
        registry.total_trust_score = registry.total_trust_score + (BASE_SCORE as u128);
        registry.trust_level_counts.new_count = registry.trust_level_counts.new_count + 1;

        let id = object::id(&score);
        transfer::transfer(score, user);
        id
    }

    public fun initialize_review_store(ctx: &mut TxContext) {
        let store = ReviewStore {
            id: object::new(ctx),
            reviews: vector::empty<Review>(),
        };
        transfer::share_object(store);
    }

    public fun initialize_history(user: address, ctx: &mut TxContext) {
        let history = HistoryStore {
            id: object::new(ctx),
            user: user,
            entries: vector::empty<ReputationHistory>(),
        };
        transfer::transfer(history, user);
    }

    public fun get_trust_score(score: &ReputationScore): u64 { score.trust_score }
    public fun get_trust_level(score: &ReputationScore): u8 { score.trust_level }
    public fun get_completed_bookings(score: &ReputationScore): u64 { score.completed_bookings }
    public fun get_total_bookings(score: &ReputationScore): u64 { score.total_bookings }
    public fun get_user(score: &ReputationScore): address { score.user }
    public fun get_created_at(score: &ReputationScore): u64 { score.created_at }
    public fun get_updated_at(score: &ReputationScore): u64 { score.updated_at }

    public fun get_average_rating(score: &ReputationScore): u64 {
        if (score.rating_count == 0) { return 0 };
        score.rating_sum / score.rating_count
    }

    public fun get_detection_flags(score: &ReputationScore): &vector<u8> { &score.detection_flags }

    public fun get_reputation_stats(registry: &ReputationRegistry): (u64, u64, TrustLevelCounts) {
        let avg = if (registry.total_users > 0) {
            (registry.total_trust_score / (registry.total_users as u128)) as u64
        } else { 0 };
        (registry.total_users, avg, registry.trust_level_counts)
    }

    public fun get_admin(registry: &ReputationRegistry): address { registry.admin }
    public fun is_admin(registry: &ReputationRegistry, addr: address): bool { registry.admin == addr }

    public fun get_reputation_data(score: &ReputationScore): (address, u64, u8, u64, u64, u64) {
        (score.user, score.trust_score, score.trust_level, score.completed_bookings, score.total_bookings, get_average_rating(score))
    }

    public fun get_trust_level_counts(counts: &TrustLevelCounts): (u64, u64, u64, u64, u64) {
        (counts.new_count, counts.low_count, counts.medium_count, counts.high_count, counts.very_high_count)
    }

    public fun update_user_rep(
        registry: &mut ReputationRegistry,
        score: &mut ReputationScore,
        completed: u64,
        total: u64,
        account_age_ns: u64,
        _ctx: &mut TxContext
    ) {
        let current_time = tx_context::epoch(_ctx);
        let old_level = score.trust_level;

        let avg_rating = if (score.rating_count > 0) { score.rating_sum / score.rating_count } else { 0 };

        let new_score = calculate_trust_score_client(completed, total, avg_rating, account_age_ns, vector::length(&score.detection_flags));
        let new_level = determine_trust_level(new_score);

        let old_score = score.trust_score;
        score.trust_score = new_score;
        score.trust_level = new_level;
        score.updated_at = current_time;

        update_registry_totals(registry, old_score, new_score, old_level, new_level);
    }

    public fun update_provider_rep(
        registry: &mut ReputationRegistry,
        score: &mut ReputationScore,
        completed: u64,
        total: u64,
        account_age_ns: u64,
        _ctx: &mut TxContext
    ) {
        let current_time = tx_context::epoch(_ctx);
        let old_level = score.trust_level;

        let avg_rating = if (score.rating_count > 0) { score.rating_sum / score.rating_count } else { 0 };

        let new_score = calculate_trust_provider(completed, total, avg_rating, account_age_ns, vector::length(&score.detection_flags));
        let new_level = determine_trust_level(new_score);

        let old_score = score.trust_score;
        score.trust_score = new_score;
        score.trust_level = new_level;
        score.updated_at = current_time;

        update_registry_totals(registry, old_score, new_score, old_level, new_level);
    }

    public fun process_review(
        registry: &mut ReputationRegistry,
        client_score: &mut ReputationScore,
        provider_score: &mut ReputationScore,
        rating: u64,
        comment: String,
        ctx: &mut TxContext
    ) {
        let current_time = tx_context::epoch(ctx);

        let flags = analyze_review(&comment, rating);

        let old_lvl_c = client_score.trust_level;
        client_score.rating_sum = client_score.rating_sum + rating;
        client_score.rating_count = client_score.rating_count + 1;
        client_score.total_bookings = client_score.total_bookings + 1;

        let mut i = 0;
        while (i < vector::length(&flags)) {
            vector::push_back(&mut client_score.detection_flags, *vector::borrow(&flags, i));
            i = i + 1;
        };

        let avg_c = client_score.rating_sum / client_score.rating_count;
        let new_score_c = calculate_trust_score_client(client_score.completed_bookings, client_score.total_bookings, avg_c, current_time - client_score.created_at, vector::length(&client_score.detection_flags));
        let new_lvl_c = determine_trust_level(new_score_c);
        let old_score_c = client_score.trust_score;
        client_score.trust_score = new_score_c;
        client_score.trust_level = new_lvl_c;
        client_score.updated_at = current_time;

        update_registry_totals(registry, old_score_c, new_score_c, old_lvl_c, new_lvl_c);

        let old_lvl_p = provider_score.trust_level;
        provider_score.rating_sum = provider_score.rating_sum + rating;
        provider_score.rating_count = provider_score.rating_count + 1;
        provider_score.completed_bookings = provider_score.completed_bookings + 1;
        provider_score.total_bookings = provider_score.total_bookings + 1;

        let avg_p = provider_score.rating_sum / provider_score.rating_count;
        let new_score_p = calculate_trust_provider(provider_score.completed_bookings, provider_score.total_bookings, avg_p, current_time - provider_score.created_at, 0);
        let new_lvl_p = determine_trust_level(new_score_p);
        let old_score_p = provider_score.trust_score;
        provider_score.trust_score = new_score_p;
        provider_score.trust_level = new_lvl_p;
        provider_score.updated_at = current_time;

        update_registry_totals(registry, old_score_p, new_score_p, old_lvl_p, new_lvl_p);
    }

    public fun process_provider_review(
        registry: &mut ReputationRegistry,
        client_score: &mut ReputationScore,
        rating: u64,
        comment: String,
        ctx: &mut TxContext
    ) {
        let current_time = tx_context::epoch(ctx);

        let flags = analyze_review(&comment, rating);

        let old_level = client_score.trust_level;
        client_score.rating_sum = client_score.rating_sum + rating;
        client_score.rating_count = client_score.rating_count + 1;

        let mut i = 0;
        while (i < vector::length(&flags)) {
            vector::push_back(&mut client_score.detection_flags, *vector::borrow(&flags, i));
            i = i + 1;
        };

        let avg = client_score.rating_sum / client_score.rating_count;
        let new_score = calculate_trust_score_client(client_score.completed_bookings, client_score.total_bookings, avg, current_time - client_score.created_at, vector::length(&client_score.detection_flags));
        let new_level = determine_trust_level(new_score);
        let old_score = client_score.trust_score;
        client_score.trust_score = new_score;
        client_score.trust_level = new_level;
        client_score.updated_at = current_time;

        update_registry_totals(registry, old_score, new_score, old_level, new_level);
    }

    public fun deduct_for_cancellation(registry: &mut ReputationRegistry, score: &mut ReputationScore, _ctx: &mut TxContext) {
        let current_time = tx_context::epoch(_ctx);
        let old_level = score.trust_level;

        let new_score = if (score.trust_score >= CANCELLATION_PENALTY) { score.trust_score - CANCELLATION_PENALTY } else { 0 };
        let new_level = determine_trust_level(new_score);

        let old_score = score.trust_score;
        score.trust_score = new_score;
        score.trust_level = new_level;
        score.updated_at = current_time;

        update_registry_totals(registry, old_score, new_score, old_level, new_level);
    }

    public fun set_trust_score(registry: &mut ReputationRegistry, score: &mut ReputationScore, new_score: u64, ctx: &mut TxContext) {
        assert!(registry.admin == sender(ctx), 0);

        let current_time = tx_context::epoch(ctx);
        let old_level = score.trust_level;

        let clamped = clamp_score(new_score);
        let new_level = determine_trust_level(clamped);

        let old = score.trust_score;
        score.trust_score = clamped;
        score.trust_level = new_level;
        score.updated_at = current_time;

        update_registry_totals(registry, old, clamped, old_level, new_level);
    }

    public fun delete_reputation(registry: &mut ReputationRegistry, score: ReputationScore, _ctx: &mut TxContext) {
        let level = score.trust_level;
        if (level == TRUST_LEVEL_NEW) { registry.trust_level_counts.new_count = registry.trust_level_counts.new_count - 1; }
        else if (level == TRUST_LEVEL_LOW) { registry.trust_level_counts.low_count = registry.trust_level_counts.low_count - 1; }
        else if (level == TRUST_LEVEL_MEDIUM) { registry.trust_level_counts.medium_count = registry.trust_level_counts.medium_count - 1; }
        else if (level == TRUST_LEVEL_HIGH) { registry.trust_level_counts.high_count = registry.trust_level_counts.high_count - 1; }
        else if (level == TRUST_LEVEL_VERY_HIGH) { registry.trust_level_counts.very_high_count = registry.trust_level_counts.very_high_count - 1; };

        registry.total_users = registry.total_users - 1;
        let score_u128 = score.trust_score as u128;
        if (registry.total_trust_score >= score_u128) {
            registry.total_trust_score = registry.total_trust_score - score_u128;
        } else {
            registry.total_trust_score = 0;
        };

        let ReputationScore { id, user: _, trust_score: _, trust_level: _, completed_bookings: _, total_bookings: _, rating_sum: _, rating_count: _, detection_flags: _, created_at: _, updated_at: _ } = score;
        object::delete(id);
    }

    public fun add_review(store: &mut ReviewStore, review: Review, _ctx: &mut TxContext) {
        vector::push_back(&mut store.reviews, review);
    }

    public fun create_review(
        id: String,
        booking_id: String,
        client_id: address,
        provider_id: address,
        service_id: String,
        rating: u64,
        comment: String,
        created_at: u64,
    ): Review {
        Review {
            id,
            booking_id,
            client_id,
            provider_id,
            service_id,
            rating,
            comment,
            status: REVIEW_STATUS_VISIBLE,
            quality_score: calculate_sentiment(&comment),
            created_at,
        }
    }

    public fun get_review_count(store: &ReviewStore): u64 {
        vector::length(&store.reviews)
    }

    public fun record_history(history: &mut HistoryStore, trust_score: u64, trust_level: u8, timestamp: u64) {
        vector::push_back(&mut history.entries, ReputationHistory {
            trust_score,
            trust_level,
            timestamp,
        });
    }

    public fun get_history_count(history: &HistoryStore): u64 {
        vector::length(&history.entries)
    }

    public fun increment_bookings(score: &mut ReputationScore) {
        score.total_bookings = score.total_bookings + 1;
    }

    public fun complete_booking(score: &mut ReputationScore) {
        score.completed_bookings = score.completed_bookings + 1;
        score.total_bookings = score.total_bookings + 1;
    }
}
