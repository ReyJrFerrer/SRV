import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Types "../types/shared";

/**
 * Simplified Auth Canister
 * 
 * This canister now serves as a simple oracle for validating principals.
 * All account management has been migrated to Firebase Cloud Functions.
 */
persistent actor AuthCanister {
    // Type definitions
    type Profile = Types.Profile;
    type Result<T> = Types.Result<T>;

    // State variables - keeping minimal state for principal validation
    private var profileEntries : [(Principal, Profile)] = [];
    private transient var profiles = HashMap.HashMap<Principal, Profile>(10, Principal.equal, Principal.hash);

    // Initialization
    system func preupgrade() {
        profileEntries := Iter.toArray(profiles.entries());
    };

    system func postupgrade() {
        profiles := HashMap.fromIter<Principal, Profile>(profileEntries.vals(), 10, Principal.equal, Principal.hash);
        profileEntries := [];
    };

    /**
     * Validate if a Principal has a valid profile
     * This is used by the Identity Bridge Cloud Function
     * @param userId - The principal to validate
     * @return Result<Profile> - Returns ok with profile if valid, err if not found
     */
    public query func isPrincipalValid(userId : Principal) : async Result<Profile> {
        switch (profiles.get(userId)) {
            case (?profile) {
                return #ok(profile);
            };
            case (null) {
                return #err("Principal not found or invalid");
            };
        };
    };

    /**
     * Get profile by principal (kept for backward compatibility)
     * @param userId - The principal to look up
     * @return Result<Profile> - Returns ok with profile if found, err if not found
     */
    public query func getProfile(userId : Principal) : async Result<Profile> {
        switch (profiles.get(userId)) {
            case (?profile) {
                return #ok(profile);
            };
            case (null) {
                return #err("Principal not found or invalid");
            };
        };
    };
}