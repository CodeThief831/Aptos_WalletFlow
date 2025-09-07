module onramp_addr::KYCModule {
    use std::signer;
    use std::string::{Self, String};
    use std::timestamp;
    use aptos_framework::table::{Self, Table};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ALREADY_VERIFIED: u64 = 2;
    const E_NOT_VERIFIED: u64 = 3;
    const E_VERIFICATION_EXPIRED: u64 = 4;
    const E_INVALID_LEVEL: u64 = 5;

    /// KYC verification levels
    const KYC_LEVEL_0: u8 = 0; // No verification
    const KYC_LEVEL_1: u8 = 1; // Basic verification (email, phone)
    const KYC_LEVEL_2: u8 = 2; // Document verification (ID, address proof)
    const KYC_LEVEL_3: u8 = 3; // Enhanced verification (video call, bank statements)

    /// KYC data structure
    struct KYCData has store, drop, copy {
        user: address,
        verification_level: u8,
        verified_at: u64,
        expires_at: u64,
        verifier: address,
        document_hash: String, // Hash of submitted documents
        metadata: String,      // Additional verification data
    }

    /// KYC limits based on verification level
    struct KYCLimits has store, drop, copy {
        daily_limit: u64,
        monthly_limit: u64,
        transaction_limit: u64,
        requires_manual_review: bool,
    }

    /// KYC configuration
    struct KYCConfig has key {
        admin: address,
        authorized_verifiers: Table<address, bool>,
        user_kyc_data: Table<address, KYCData>,
        kyc_limits: Table<u8, KYCLimits>,
        verification_validity_period: u64, // In microseconds
        required_level_for_withdrawal: u8,
    }

    /// KYC verification event
    struct KYCVerificationEvent has store, drop {
        user: address,
        old_level: u8,
        new_level: u8,
        verifier: address,
        timestamp: u64,
        document_hash: String,
    }

    /// Events
    struct KYCEvents has key {
        verification_events: EventHandle<KYCVerificationEvent>,
    }

    /// Initialize KYC module
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        assert!(!exists<KYCConfig>(admin_addr), E_NOT_AUTHORIZED);

        let authorized_verifiers = table::new<address, bool>();
        table::add(&mut authorized_verifiers, admin_addr, true);

        let user_kyc_data = table::new<address, KYCData>();
        
        let kyc_limits = table::new<u8, KYCLimits>();
        
        // Set limits for each KYC level
        table::add(&mut kyc_limits, KYC_LEVEL_0, KYCLimits {
            daily_limit: 100000, // 1000 INR per day
            monthly_limit: 1000000, // 10,000 INR per month
            transaction_limit: 50000, // 500 INR per transaction
            requires_manual_review: true,
        });
        
        table::add(&mut kyc_limits, KYC_LEVEL_1, KYCLimits {
            daily_limit: 1000000, // 10,000 INR per day
            monthly_limit: 10000000, // 100,000 INR per month
            transaction_limit: 500000, // 5,000 INR per transaction
            requires_manual_review: false,
        });
        
        table::add(&mut kyc_limits, KYC_LEVEL_2, KYCLimits {
            daily_limit: 10000000, // 100,000 INR per day
            monthly_limit: 100000000, // 1,000,000 INR per month
            transaction_limit: 5000000, // 50,000 INR per transaction
            requires_manual_review: false,
        });
        
        table::add(&mut kyc_limits, KYC_LEVEL_3, KYCLimits {
            daily_limit: 100000000, // 1,000,000 INR per day
            monthly_limit: 1000000000, // 10,000,000 INR per month
            transaction_limit: 50000000, // 500,000 INR per transaction
            requires_manual_review: false,
        });

        move_to(admin, KYCConfig {
            admin: admin_addr,
            authorized_verifiers,
            user_kyc_data,
            kyc_limits,
            verification_validity_period: 365 * 24 * 60 * 60 * 1000000, // 1 year
            required_level_for_withdrawal: KYC_LEVEL_1,
        });

        move_to(admin, KYCEvents {
            verification_events: account::new_event_handle<KYCVerificationEvent>(admin),
        });
    }

    /// Verify user KYC (verifier only)
    public entry fun verify_user(
        verifier: &signer,
        user: address,
        verification_level: u8,
        document_hash: String,
        metadata: String,
    ) acquires KYCConfig, KYCEvents {
        let verifier_addr = signer::address_of(verifier);
        let config = borrow_global_mut<KYCConfig>(@onramp_addr);
        let events = borrow_global_mut<KYCEvents>(@onramp_addr);

        // Check authorization
        assert!(
            table::contains(&config.authorized_verifiers, verifier_addr) &&
            *table::borrow(&config.authorized_verifiers, verifier_addr),
            E_NOT_AUTHORIZED
        );

        assert!(verification_level <= KYC_LEVEL_3, E_INVALID_LEVEL);

        let current_time = timestamp::now_microseconds();
        let expires_at = current_time + config.verification_validity_period;

        let old_level = if (table::contains(&config.user_kyc_data, user)) {
            table::borrow(&config.user_kyc_data, user).verification_level
        } else {
            KYC_LEVEL_0
        };

        let kyc_data = KYCData {
            user,
            verification_level,
            verified_at: current_time,
            expires_at,
            verifier: verifier_addr,
            document_hash,
            metadata,
        };

        if (table::contains(&config.user_kyc_data, user)) {
            *table::borrow_mut(&mut config.user_kyc_data, user) = kyc_data;
        } else {
            table::add(&mut config.user_kyc_data, user, kyc_data);
        };

        // Emit event
        event::emit_event(&mut events.verification_events, KYCVerificationEvent {
            user,
            old_level,
            new_level: verification_level,
            verifier: verifier_addr,
            timestamp: current_time,
            document_hash,
        });
    }

    /// Check if user meets KYC requirements for a transaction
    public fun check_kyc_compliance(
        user: address,
        transaction_amount: u64,
        is_withdrawal: bool,
    ): bool acquires KYCConfig {
        let config = borrow_global<KYCConfig>(@onramp_addr);
        
        if (!table::contains(&config.user_kyc_data, user)) {
            return false
        };

        let kyc_data = table::borrow(&config.user_kyc_data, user);
        
        // Check if verification is expired
        if (timestamp::now_microseconds() > kyc_data.expires_at) {
            return false
        };

        // Check minimum level for withdrawals
        if (is_withdrawal && kyc_data.verification_level < config.required_level_for_withdrawal) {
            return false
        };

        // Check transaction limits
        let limits = table::borrow(&config.kyc_limits, kyc_data.verification_level);
        if (transaction_amount > limits.transaction_limit) {
            return false
        };

        true
    }

    /// Get user KYC status
    public fun get_kyc_status(user: address): (u8, u64, u64, bool) acquires KYCConfig {
        let config = borrow_global<KYCConfig>(@onramp_addr);
        
        if (table::contains(&config.user_kyc_data, user)) {
            let kyc_data = table::borrow(&config.user_kyc_data, user);
            let is_expired = timestamp::now_microseconds() > kyc_data.expires_at;
            (kyc_data.verification_level, kyc_data.verified_at, kyc_data.expires_at, is_expired)
        } else {
            (KYC_LEVEL_0, 0, 0, false)
        }
    }

    /// Get KYC limits for a verification level
    public fun get_kyc_limits(verification_level: u8): (u64, u64, u64, bool) acquires KYCConfig {
        let config = borrow_global<KYCConfig>(@onramp_addr);
        
        if (table::contains(&config.kyc_limits, verification_level)) {
            let limits = table::borrow(&config.kyc_limits, verification_level);
            (limits.daily_limit, limits.monthly_limit, limits.transaction_limit, limits.requires_manual_review)
        } else {
            (0, 0, 0, true)
        }
    }

    /// Update KYC limits (admin only)
    public entry fun update_kyc_limits(
        admin: &signer,
        verification_level: u8,
        daily_limit: u64,
        monthly_limit: u64,
        transaction_limit: u64,
        requires_manual_review: bool,
    ) acquires KYCConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<KYCConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(verification_level <= KYC_LEVEL_3, E_INVALID_LEVEL);

        let new_limits = KYCLimits {
            daily_limit,
            monthly_limit,
            transaction_limit,
            requires_manual_review,
        };

        if (table::contains(&config.kyc_limits, verification_level)) {
            *table::borrow_mut(&mut config.kyc_limits, verification_level) = new_limits;
        } else {
            table::add(&mut config.kyc_limits, verification_level, new_limits);
        };
    }

    /// Add authorized verifier (admin only)
    public entry fun add_verifier(admin: &signer, verifier: address) acquires KYCConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<KYCConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        
        if (table::contains(&config.authorized_verifiers, verifier)) {
            *table::borrow_mut(&mut config.authorized_verifiers, verifier) = true;
        } else {
            table::add(&mut config.authorized_verifiers, verifier, true);
        };
    }

    /// Remove authorized verifier (admin only)
    public entry fun remove_verifier(admin: &signer, verifier: address) acquires KYCConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<KYCConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        
        if (table::contains(&config.authorized_verifiers, verifier)) {
            *table::borrow_mut(&mut config.authorized_verifiers, verifier) = false;
        };
    }

    /// Update verification validity period (admin only)
    public entry fun update_validity_period(
        admin: &signer,
        new_period: u64,
    ) acquires KYCConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<KYCConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        config.verification_validity_period = new_period;
    }

    /// Set required KYC level for withdrawals (admin only)
    public entry fun set_required_withdrawal_level(
        admin: &signer,
        required_level: u8,
    ) acquires KYCConfig {
        let admin_addr = signer::address_of(admin);
        let config = borrow_global_mut<KYCConfig>(@onramp_addr);
        
        assert!(admin_addr == config.admin, E_NOT_AUTHORIZED);
        assert!(required_level <= KYC_LEVEL_3, E_INVALID_LEVEL);
        
        config.required_level_for_withdrawal = required_level;
    }

    /// Revoke user verification (admin/verifier only)
    public entry fun revoke_verification(
        authority: &signer,
        user: address,
        reason: String,
    ) acquires KYCConfig, KYCEvents {
        let authority_addr = signer::address_of(authority);
        let config = borrow_global_mut<KYCConfig>(@onramp_addr);
        let events = borrow_global_mut<KYCEvents>(@onramp_addr);

        // Check authorization (admin or verifier)
        assert!(
            authority_addr == config.admin ||
            (table::contains(&config.authorized_verifiers, authority_addr) &&
             *table::borrow(&config.authorized_verifiers, authority_addr)),
            E_NOT_AUTHORIZED
        );

        if (table::contains(&config.user_kyc_data, user)) {
            let old_level = table::borrow(&config.user_kyc_data, user).verification_level;
            
            // Set verification level to 0
            let revoked_data = KYCData {
                user,
                verification_level: KYC_LEVEL_0,
                verified_at: timestamp::now_microseconds(),
                expires_at: 0,
                verifier: authority_addr,
                document_hash: string::utf8(b"REVOKED"),
                metadata: reason,
            };

            *table::borrow_mut(&mut config.user_kyc_data, user) = revoked_data;

            // Emit event
            event::emit_event(&mut events.verification_events, KYCVerificationEvent {
                user,
                old_level,
                new_level: KYC_LEVEL_0,
                verifier: authority_addr,
                timestamp: timestamp::now_microseconds(),
                document_hash: string::utf8(b"REVOKED"),
            });
        };
    }
}
