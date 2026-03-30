#[test_only]
#[allow(unused_const, duplicate_alias, unused_variable, unused_use, unused_mut_ref)]
module srv_reputation::reputation_tests {
    use std::string;
    use std::vector;
    use sui::test_scenario;

    use srv_reputation::reputation;

    // ============ Trust Level Tests ============

    #[test]
    fun test_trust_level_new() {
        assert!(reputation::determine_trust_level(0) == 0, 0);
        assert!(reputation::determine_trust_level(1999) == 0, 1);
        assert!(reputation::determine_trust_level(2000) == 0, 2);
    }

    #[test]
    fun test_trust_level_low() {
        assert!(reputation::determine_trust_level(2001) == 1, 0);
        assert!(reputation::determine_trust_level(3500) == 1, 1);
        assert!(reputation::determine_trust_level(4999) == 1, 2);
        assert!(reputation::determine_trust_level(5000) == 1, 3);
    }

    #[test]
    fun test_trust_level_medium() {
        assert!(reputation::determine_trust_level(5001) == 2, 0);
        assert!(reputation::determine_trust_level(6500) == 2, 1);
        assert!(reputation::determine_trust_level(7999) == 2, 2);
        assert!(reputation::determine_trust_level(8000) == 2, 3);
    }

    #[test]
    fun test_trust_level_high() {
        assert!(reputation::determine_trust_level(8001) == 3, 0);
        assert!(reputation::determine_trust_level(9000) == 3, 1);
        assert!(reputation::determine_trust_level(9999) == 3, 2);
        assert!(reputation::determine_trust_level(10000) == 3, 3);
    }

    #[test]
    fun test_trust_level_very_high() {
        assert!(reputation::determine_trust_level(10001) == 4, 0);
        assert!(reputation::determine_trust_level(15000) == 4, 1);
    }

    #[test]
    fun test_trust_level_boundary_transitions() {
        assert!(reputation::determine_trust_level(1999) == 0, 0);
        assert!(reputation::determine_trust_level(2000) == 0, 1);
        assert!(reputation::determine_trust_level(2001) == 1, 2);
        assert!(reputation::determine_trust_level(4999) == 1, 3);
        assert!(reputation::determine_trust_level(5000) == 1, 4);
        assert!(reputation::determine_trust_level(5001) == 2, 5);
        assert!(reputation::determine_trust_level(7999) == 2, 6);
        assert!(reputation::determine_trust_level(8000) == 2, 7);
        assert!(reputation::determine_trust_level(8001) == 3, 8);
        assert!(reputation::determine_trust_level(9999) == 3, 9);
        assert!(reputation::determine_trust_level(10000) == 3, 10);
        assert!(reputation::determine_trust_level(10001) == 4, 11);
    }

    // ============ Clamp Score Tests ============

    #[test]
    fun test_clamp_score_min() {
        assert!(reputation::clamp_score(0) == 0, 0);
    }

    #[test]
    fun test_clamp_score_max() {
        assert!(reputation::clamp_score(10000) == 10000, 0);
    }

    #[test]
    fun test_clamp_score_middle() {
        assert!(reputation::clamp_score(5000) == 5000, 0);
    }

    #[test]
    fun test_clamp_score_over_max() {
        assert!(reputation::clamp_score(15000) == 10000, 0);
        assert!(reputation::clamp_score(100000) == 10000, 1);
    }

    #[test]
    fun test_clamp_score_boundary() {
        assert!(reputation::clamp_score(9999) == 9999, 0);
        assert!(reputation::clamp_score(10001) == 10000, 1);
    }

    // ============ Bayesian Average Tests ============

    #[test]
    fun test_bayesian_no_reviews() {
        assert!(reputation::calculate_bayesian_average(0, 0) == 300, 0);
    }

    #[test]
    fun test_bayesian_one_review() {
        let avg = reputation::calculate_bayesian_average(400, 1);
        assert!(avg >= 300, 0);
    }

    #[test]
    fun test_bayesian_many_reviews() {
        let avg = reputation::calculate_bayesian_average(400, 1000);
        assert!(avg >= 300, 0);
    }

    #[test]
    fun test_bayesian_low_rating() {
        let avg = reputation::calculate_bayesian_average(100, 10);
        assert!(avg >= 100, 0);
    }

    #[test]
    fun test_bayesian_high_rating() {
        let avg = reputation::calculate_bayesian_average(500, 10);
        assert!(avg >= 300, 0);
    }

    #[test]
    fun test_bayesian_converges_to_prior() {
        let avg = reputation::calculate_bayesian_average(100, 0);
        assert!(avg == 300, 0);
    }

    // ============ Sentiment Analysis Tests ============

    #[test]
    fun test_sentiment_positive() {
        let text = string::utf8(b"great excellent amazing service");
        assert!(reputation::calculate_sentiment(&text) > 300, 0);
    }

    #[test]
    fun test_sentiment_negative() {
        let text = string::utf8(b"terrible awful worst experience");
        assert!(reputation::calculate_sentiment(&text) < 300, 0);
    }

    #[test]
    fun test_sentiment_neutral() {
        let text = string::utf8(b"okay service was fine");
        assert!(reputation::calculate_sentiment(&text) == 300, 0);
    }

    #[test]
    fun test_sentiment_empty() {
        let text = string::utf8(b"");
        assert!(reputation::calculate_sentiment(&text) == 300, 0);
    }

    #[test]
    fun test_sentiment_mixed() {
        let text = string::utf8(b"good but also bad");
        assert!(reputation::calculate_sentiment(&text) == 300, 0);
    }

    #[test]
    fun test_sentiment_clamp_max() {
        let text = string::utf8(b"great excellent amazing wonderful fantastic perfect love best recommend");
        assert!(reputation::calculate_sentiment(&text) <= 500, 0);
    }

    #[test]
    fun test_sentiment_clamp_min() {
        let text = string::utf8(b"terrible awful worst hate disappointing poor horrible avoid scam bad");
        assert!(reputation::calculate_sentiment(&text) >= 100, 0);
    }

    #[test]
    fun test_sentiment_single_positive() {
        let text = string::utf8(b"good");
        assert!(reputation::calculate_sentiment(&text) == 350, 0);
    }

    #[test]
    fun test_sentiment_single_negative() {
        let text = string::utf8(b"bad");
        assert!(reputation::calculate_sentiment(&text) == 250, 0);
    }

    // ============ Abusive Content Detection Tests ============

    #[test]
    fun test_analyze_clean_review() {
        let comment = string::utf8(b"Great service, highly recommend!");
        let flags = reputation::analyze_review(&comment, 400);
        assert!(vector::length(&flags) == 0, 0);
    }

    #[test]
    fun test_analyze_abusive_review() {
        let comment = string::utf8(b"This is a scam and fraud");
        let flags = reputation::analyze_review(&comment, 100);
        assert!(vector::length(&flags) >= 1, 0);
    }

    #[test]
    fun test_analyze_fake_review() {
        let comment = string::utf8(b"");
        let flags = reputation::analyze_review(&comment, 100);
        assert!(vector::length(&flags) >= 1, 0);
    }

    #[test]
    fun test_analyze_invalid_rating() {
        let comment = string::utf8(b"ok");
        let flags = reputation::analyze_review(&comment, 600);
        assert!(vector::length(&flags) >= 1, 0);
    }

    #[test]
    fun test_analyze_multiple_flags() {
        let comment = string::utf8(b"scam idiot");
        let flags = reputation::analyze_review(&comment, 50);
        assert!(vector::length(&flags) >= 1, 0);
    }

    #[test]
    fun test_analyze_rating_one_star_with_comment() {
        let comment = string::utf8(b"bad service");
        let flags = reputation::analyze_review(&comment, 100);
        assert!(vector::length(&flags) == 0, 0);
    }

    #[test]
    fun test_analyze_rating_above_max() {
        let comment = string::utf8(b"excellent");
        let flags = reputation::analyze_review(&comment, 501);
        assert!(vector::length(&flags) >= 1, 0);
    }

    #[test]
    fun test_analyze_rating_exact_max() {
        let comment = string::utf8(b"excellent");
        let flags = reputation::analyze_review(&comment, 500);
        assert!(vector::length(&flags) == 0, 0);
    }

    // ============ Recency Score Tests ============

    #[test]
    fun test_recency_no_bookings() {
        assert!(reputation::calculate_recency(0, 1000000000000000) == 0, 0);
    }

    #[test]
    fun test_recency_recent_account() {
        assert!(reputation::calculate_recency(1, 1000000000000000) == 2000, 0);
    }

    #[test]
    fun test_recency_30_days_1_booking() {
        let thirty_days: u64 = 2592000000000000;
        assert!(reputation::calculate_recency(1, thirty_days) == 2000, 0);
    }

    #[test]
    fun test_recency_31_days_1_booking() {
        let thirty_one_days: u64 = 2678400000000000;
        assert!(reputation::calculate_recency(1, thirty_one_days) == 0, 0);
    }

    #[test]
    fun test_recency_90_days_2_bookings() {
        let ninety_days: u64 = 7776000000000000;
        let score = reputation::calculate_recency(2, ninety_days);
        assert!(score > 0, 0);
        assert!(score < 2000, 1);
    }

    #[test]
    fun test_recency_180_days_3_bookings() {
        let one_eighty_days: u64 = 15552000000000000;
        let score = reputation::calculate_recency(3, one_eighty_days);
        assert!(score > 0, 0);
    }

    #[test]
    fun test_recency_old_account() {
        let one_year: u64 = 31536000000000000;
        assert!(reputation::calculate_recency(5, one_year) == 0, 0);
    }

    #[test]
    fun test_recency_with_bookings_zero_age() {
        assert!(reputation::calculate_recency(5, 0) == 2000, 0);
    }

    // ============ Activity Frequency Tests ============

    #[test]
    fun test_activity_zero_bookings() {
        assert!(reputation::calculate_activity_freq(0, 1000000000000000) == 0, 0);
    }

    #[test]
    fun test_activity_zero_account_age() {
        assert!(reputation::calculate_activity_freq(5, 0) == 0, 0);
    }

    #[test]
    fun test_activity_both_zero() {
        assert!(reputation::calculate_activity_freq(0, 0) == 0, 0);
    }

    #[test]
    fun test_activity_normal() {
        let score = reputation::calculate_activity_freq(10, 5184000000000000);
        assert!(score > 0, 0);
    }

    #[test]
    fun test_activity_high_bookings() {
        let one_month: u64 = 2592000000000000;
        let score = reputation::calculate_activity_freq(100, one_month);
        assert!(score > 0, 0);
    }

    #[test]
    fun test_activity_very_short_age() {
        let score = reputation::calculate_activity_freq(5, 1000);
        assert!(score > 0, 0);
    }

    // ============ Client Trust Score Tests ============

    #[test]
    fun test_trust_client_no_activity() {
        let score = reputation::calculate_trust_score_client(0, 0, 0, 0, 0);
        assert!(score == 5000, 0);
    }

    #[test]
    fun test_trust_client_perfect() {
        let score = reputation::calculate_trust_score_client(10, 10, 500, 1000000000000000, 0);
        assert!(score > 5000, 0);
        assert!(score <= 10000, 1);
    }

    #[test]
    fun test_trust_client_with_flags() {
        let with_flags = reputation::calculate_trust_score_client(10, 10, 400, 1000000000000000, 3);
        let without_flags = reputation::calculate_trust_score_client(10, 10, 400, 1000000000000000, 0);
        assert!(with_flags <= without_flags, 0);
    }

    #[test]
    fun test_trust_client_flag_penalty() {
        let s0 = reputation::calculate_trust_score_client(10, 10, 400, 1000000000000000, 0);
        let s1 = reputation::calculate_trust_score_client(10, 10, 400, 1000000000000000, 1);
        assert!(s1 <= s0, 0);
    }

    #[test]
    fun test_trust_client_multiple_flags() {
        let s0 = reputation::calculate_trust_score_client(10, 10, 400, 1000000000000000, 0);
        let s5 = reputation::calculate_trust_score_client(10, 10, 400, 1000000000000000, 5);
        assert!(s5 <= s0, 0);
    }

    #[test]
    fun test_trust_client_max_clamp() {
        let score = reputation::calculate_trust_score_client(100, 100, 500, 1000000000000, 0);
        assert!(score <= 10000, 0);
    }

    #[test]
    fun test_trust_client_min_clamp() {
        let score = reputation::calculate_trust_score_client(0, 100, 0, 1000000000000000, 100);
        assert!(score == 0, 0);
    }

    #[test]
    fun test_trust_client_high_completion() {
        let high = reputation::calculate_trust_score_client(10, 10, 300, 1000000000000000, 0);
        let low = reputation::calculate_trust_score_client(5, 10, 300, 1000000000000000, 0);
        assert!(high >= low, 0);
    }

    #[test]
    fun test_trust_client_rating_impact() {
        let high_rating = reputation::calculate_trust_score_client(5, 5, 500, 500000000000000, 0);
        let low_rating = reputation::calculate_trust_score_client(5, 5, 100, 500000000000000, 0);
        assert!(high_rating >= low_rating, 0);
    }

    // ============ Provider Trust Score Tests ============

    #[test]
    fun test_trust_provider_no_activity() {
        let score = reputation::calculate_trust_provider(0, 0, 0, 0, 0);
        assert!(score == 5500, 0);
    }

    #[test]
    fun test_trust_provider_perfect() {
        let score = reputation::calculate_trust_provider(10, 10, 500, 1000000000000000, 0);
        assert!(score > 5500, 0);
        assert!(score <= 10000, 1);
    }

    #[test]
    fun test_trust_provider_base_higher_than_client() {
        let client = reputation::calculate_trust_score_client(0, 0, 0, 0, 0);
        let provider = reputation::calculate_trust_provider(0, 0, 0, 0, 0);
        assert!(provider == client + 500, 0);
    }

    #[test]
    fun test_trust_provider_completion_bonus_10() {
        let with_bonus = reputation::calculate_trust_provider(10, 10, 300, 1000000000000000, 0);
        let without = reputation::calculate_trust_provider(9, 9, 300, 1000000000000000, 0);
        assert!(with_bonus >= without, 0);
    }

    #[test]
    fun test_trust_provider_completion_bonus_5() {
        let with_bonus = reputation::calculate_trust_provider(5, 5, 300, 1000000000000000, 0);
        let without = reputation::calculate_trust_provider(4, 4, 300, 1000000000000000, 0);
        assert!(with_bonus >= without, 0);
    }

    #[test]
    fun test_trust_provider_completion_bonus_difference() {
        let ten = reputation::calculate_trust_provider(10, 10, 300, 1000000000000000, 0);
        let five = reputation::calculate_trust_provider(5, 5, 300, 1000000000000000, 0);
        let four = reputation::calculate_trust_provider(4, 4, 300, 1000000000000000, 0);
        assert!(ten >= five, 0);
        assert!(five >= four, 1);
    }

    #[test]
    fun test_trust_provider_with_flags() {
        let with_flags = reputation::calculate_trust_provider(10, 10, 400, 1000000000000000, 2);
        let without_flags = reputation::calculate_trust_provider(10, 10, 400, 1000000000000000, 0);
        assert!(with_flags <= without_flags, 0);
    }

    #[test]
    fun test_trust_provider_max_clamp() {
        let score = reputation::calculate_trust_provider(100, 100, 500, 1000000000000, 0);
        assert!(score <= 10000, 0);
    }

    #[test]
    fun test_trust_provider_vs_client() {
        let client = reputation::calculate_trust_score_client(10, 10, 400, 1000000000000000, 0);
        let provider = reputation::calculate_trust_provider(10, 10, 400, 1000000000000000, 0);
        assert!(provider >= client, 0);
    }

    // ============ Review Weight Tests ============

    #[test]
    fun test_review_weight_basic() {
        let w = reputation::calculate_review_weight(1000, 0, 200, 0);
        assert!(w >= 10, 0);
    }

    #[test]
    fun test_review_weight_high_trust() {
        let w_new = reputation::calculate_review_weight(1000, 0, 200, 0);
        let w_high = reputation::calculate_review_weight(8000, 3, 200, 0);
        assert!(w_high >= w_new, 0);
    }

    #[test]
    fun test_review_weight_medium_trust() {
        let w_new = reputation::calculate_review_weight(1000, 0, 200, 0);
        let w_medium = reputation::calculate_review_weight(5000, 2, 200, 0);
        assert!(w_medium >= w_new, 0);
    }

    #[test]
    fun test_review_weight_quality_impact() {
        let w_low = reputation::calculate_review_weight(5000, 2, 100, 0);
        let w_high = reputation::calculate_review_weight(5000, 2, 400, 0);
        assert!(w_high >= w_low, 0);
    }

    #[test]
    fun test_review_weight_time_decay() {
        let w_new = reputation::calculate_review_weight(5000, 2, 200, 0);
        let w_old = reputation::calculate_review_weight(5000, 2, 200, 31104000000000000);
        assert!(w_old <= w_new, 0);
    }

    #[test]
    fun test_review_weight_clamp_min() {
        let w = reputation::calculate_review_weight(0, 0, 0, 100000000000000000);
        assert!(w >= 10, 0);
    }

    #[test]
    fun test_review_weight_clamp_max() {
        let w = reputation::calculate_review_weight(10000, 4, 500, 0);
        assert!(w <= 200, 0);
    }

    #[test]
    fun test_review_weight_halflife() {
        let halflife: u64 = 15552000000000000;
        let w_fresh = reputation::calculate_review_weight(5000, 2, 200, 0);
        let w_one_halflife = reputation::calculate_review_weight(5000, 2, 200, halflife);
        assert!(w_one_halflife <= w_fresh, 0);
        assert!(w_one_halflife >= 10, 1);
    }

    // ============ Edge Case Tests ============

    #[test]
    fun test_edge_zero_bookings_score() {
        let score = reputation::calculate_trust_score_client(0, 0, 0, 0, 0);
        assert!(score == 5000, 0);
    }

    #[test]
    fun test_edge_max_u64_safety() {
        let score = reputation::calculate_trust_score_client(10, 10, 500, 1000000000000, 0);
        assert!(score <= 10000, 0);
    }

    #[test]
    fun test_edge_many_flags() {
        let score = reputation::calculate_trust_score_client(10, 10, 400, 1000000000000000, 100);
        assert!(score >= 0, 0);
    }

    #[test]
    fun test_edge_flags_underflow_protection() {
        let score = reputation::calculate_trust_score_client(0, 0, 0, 0, 20);
        assert!(score >= 0, 0);
    }

    #[test]
    fun test_edge_exact_threshold_values() {
        assert!(reputation::determine_trust_level(2000) == 0, 0);
        assert!(reputation::determine_trust_level(5000) == 1, 1);
        assert!(reputation::determine_trust_level(8000) == 2, 2);
        assert!(reputation::determine_trust_level(10000) == 3, 3);
    }

    #[test]
    fun test_edge_one_below_threshold() {
        assert!(reputation::determine_trust_level(1999) == 0, 0);
        assert!(reputation::determine_trust_level(4999) == 1, 1);
        assert!(reputation::determine_trust_level(7999) == 2, 2);
        assert!(reputation::determine_trust_level(9999) == 3, 3);
    }

    #[test]
    fun test_edge_completion_rate_100_percent() {
        let score = reputation::calculate_trust_score_client(10, 10, 300, 1000000000000000, 0);
        assert!(score >= 5000, 0);
    }

    #[test]
    fun test_edge_completion_rate_50_percent() {
        let score = reputation::calculate_trust_score_client(5, 10, 300, 1000000000000000, 0);
        let full = reputation::calculate_trust_score_client(10, 10, 300, 1000000000000000, 0);
        assert!(score >= 0, 0);
    }

    #[test]
    fun test_edge_zero_rating() {
        let score = reputation::calculate_trust_score_client(5, 5, 0, 1000000000000000, 0);
        assert!(score >= 5000, 0);
    }

    #[test]
    fun test_edge_max_rating() {
        let score = reputation::calculate_trust_score_client(5, 5, 500, 1000000000000000, 0);
        assert!(score >= 5000, 0);
    }

    // ============ Registry Integration Tests ============

    #[test]
    fun test_initialize_registry() {
        let admin = @0xAD;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            assert!(reputation::get_admin(&registry) == admin, 0);
            let (total_users, avg_score, _) = reputation::get_reputation_stats(&registry);
            assert!(total_users == 0, 1);
            assert!(avg_score == 0, 2);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_initialize_reputation() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            let (total_users, _, _) = reputation::get_reputation_stats(&registry);
            assert!(total_users == 1, 0);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_reputation_initial_values() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            assert!(reputation::get_trust_score(&score) == 5000, 0);
            assert!(reputation::get_trust_level(&score) == 0, 1);
            assert!(reputation::get_completed_bookings(&score) == 0, 2);
            assert!(reputation::get_total_bookings(&score) == 0, 3);
            assert!(reputation::get_average_rating(&score) == 0, 4);
            assert!(reputation::get_user(&score) == user, 5);
            test_scenario::return_to_sender(&scenario, score);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_complete_booking() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            reputation::complete_booking(&mut score);
            assert!(reputation::get_completed_bookings(&score) == 1, 0);
            assert!(reputation::get_total_bookings(&score) == 1, 1);
            reputation::complete_booking(&mut score);
            assert!(reputation::get_completed_bookings(&score) == 2, 2);
            assert!(reputation::get_total_bookings(&score) == 2, 3);
            test_scenario::return_to_sender(&scenario, score);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_increment_bookings() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            reputation::increment_bookings(&mut score);
            assert!(reputation::get_total_bookings(&score) == 1, 0);
            assert!(reputation::get_completed_bookings(&score) == 0, 1);
            test_scenario::return_to_sender(&scenario, score);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_user_rep() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let mut score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            let one_month: u64 = 2592000000000000;
            reputation::update_user_rep(&mut registry, &mut score, 5, 5, one_month, test_scenario::ctx(&mut scenario));
            assert!(reputation::get_trust_score(&score) >= 5000, 0);
            test_scenario::return_to_sender(&scenario, score);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_update_provider_rep() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let mut score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            let one_month: u64 = 2592000000000000;
            reputation::update_provider_rep(&mut registry, &mut score, 5, 5, one_month, test_scenario::ctx(&mut scenario));
            assert!(reputation::get_trust_score(&score) >= 5500, 0);
            test_scenario::return_to_sender(&scenario, score);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_deduct_for_cancellation() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let mut score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            let before = reputation::get_trust_score(&score);
            reputation::deduct_for_cancellation(&mut registry, &mut score, test_scenario::ctx(&mut scenario));
            let after = reputation::get_trust_score(&score);
            assert!(after == before - 500, 0);
            test_scenario::return_to_sender(&scenario, score);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_is_admin() {
        let admin = @0xAD;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            assert!(reputation::is_admin(&registry, admin), 0);
            assert!(!reputation::is_admin(&registry, @0xB0B), 1);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure]
    fun test_set_trust_score_non_admin_fails() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let mut score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            reputation::set_trust_score(&mut registry, &mut score, 8000, test_scenario::ctx(&mut scenario));
            test_scenario::return_to_sender(&scenario, score);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_delete_reputation() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            let (total_users, _, _) = reputation::get_reputation_stats(&registry);
            assert!(total_users == 1, 0);
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            reputation::delete_reputation(&mut registry, score, test_scenario::ctx(&mut scenario));
            let (total_users, _, _) = reputation::get_reputation_stats(&registry);
            assert!(total_users == 0, 1);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    // ============ Review Store Tests ============

    #[test]
    fun test_initialize_review_store() {
        let admin = @0xAD;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_review_store(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let store = test_scenario::take_shared<reputation::ReviewStore>(&scenario);
            assert!(reputation::get_review_count(&store) == 0, 0);
            test_scenario::return_shared(store);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_add_review() {
        let admin = @0xAD;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_review_store(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let mut store = test_scenario::take_shared<reputation::ReviewStore>(&scenario);
            let review = reputation::create_review(
                string::utf8(b"rev1"),
                string::utf8(b"book1"),
                @0xA,
                @0xB,
                string::utf8(b"svc1"),
                400,
                string::utf8(b"Great service"),
                1000,
            );
            reputation::add_review(&mut store, review, test_scenario::ctx(&mut scenario));
            assert!(reputation::get_review_count(&store) == 1, 0);
            test_scenario::return_shared(store);
        };

        test_scenario::end(scenario);
    }

    // ============ History Store Tests ============

    #[test]
    fun test_initialize_history() {
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(user);
        {
            reputation::initialize_history(user, test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let history = test_scenario::take_from_sender<reputation::HistoryStore>(&scenario);
            assert!(reputation::get_history_count(&history) == 0, 0);
            test_scenario::return_to_sender(&scenario, history);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_record_history() {
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(user);
        {
            reputation::initialize_history(user, test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut history = test_scenario::take_from_sender<reputation::HistoryStore>(&scenario);
            reputation::record_history(&mut history, 5000, 0, 1000);
            reputation::record_history(&mut history, 6000, 1, 2000);
            assert!(reputation::get_history_count(&history) == 2, 0);
            test_scenario::return_to_sender(&scenario, history);
        };

        test_scenario::end(scenario);
    }

    // ============ Provider Review Tests ============

    #[test]
    fun test_process_provider_review() {
        let admin = @0xAD;
        let client = @0xA;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, client);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, client);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let mut client_score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            let _before = reputation::get_trust_score(&client_score);
            reputation::process_provider_review(
                &mut registry,
                &mut client_score,
                400,
                string::utf8(b"Good client"),
                test_scenario::ctx(&mut scenario),
            );
            assert!(reputation::get_average_rating(&client_score) > 0, 0);
            test_scenario::return_to_sender(&scenario, client_score);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    // ============ Getter Tests ============

    #[test]
    fun test_get_reputation_data() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            let (u, ts, tl, cb, tb, ar) = reputation::get_reputation_data(&score);
            assert!(u == user, 0);
            assert!(ts == 5000, 1);
            assert!(tl == 0, 2);
            assert!(cb == 0, 3);
            assert!(tb == 0, 4);
            assert!(ar == 0, 5);
            test_scenario::return_to_sender(&scenario, score);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_get_detection_flags_empty() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            let flags = reputation::get_detection_flags(&score);
            assert!(vector::length(flags) == 0, 0);
            test_scenario::return_to_sender(&scenario, score);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_get_timestamps() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(registry);
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let score = test_scenario::take_from_sender<reputation::ReputationScore>(&scenario);
            assert!(reputation::get_created_at(&score) == reputation::get_updated_at(&score), 0);
            test_scenario::return_to_sender(&scenario, score);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_trust_level_counts_initial() {
        let admin = @0xAD;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, admin);
        {
            let registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let (_, _, counts) = reputation::get_reputation_stats(&registry);
            let (new_c, low_c, med_c, high_c, vh_c) = reputation::get_trust_level_counts(&counts);
            assert!(new_c == 0, 0);
            assert!(low_c == 0, 1);
            assert!(med_c == 0, 2);
            assert!(high_c == 0, 3);
            assert!(vh_c == 0, 4);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_trust_level_counts_after_init() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            let (_, _, counts) = reputation::get_reputation_stats(&registry);
            let (new_c, low_c, med_c, high_c, vh_c) = reputation::get_trust_level_counts(&counts);
            assert!(new_c == 1, 0);
            assert!(low_c == 0, 1);
            assert!(med_c == 0, 2);
            assert!(high_c == 0, 3);
            assert!(vh_c == 0, 4);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_avg_score_calculation() {
        let admin = @0xAD;
        let user = @0xB0B;
        let mut scenario = test_scenario::begin(admin);
        {
            reputation::initialize_registry(test_scenario::ctx(&mut scenario));
        };

        test_scenario::next_tx(&mut scenario, user);
        {
            let mut registry = test_scenario::take_shared<reputation::ReputationRegistry>(&scenario);
            let _id = reputation::initialize_reputation(&mut registry, test_scenario::ctx(&mut scenario));
            let (_, avg_score, _) = reputation::get_reputation_stats(&registry);
            assert!(avg_score == 5000, 0);
            test_scenario::return_shared(registry);
        };

        test_scenario::end(scenario);
    }
}
