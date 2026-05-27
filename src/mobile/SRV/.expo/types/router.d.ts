/* eslint-disable */
import * as Router from "expo-router";

export * from "expo-router";

declare module "expo-router" {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams:
        | {
            pathname: Router.RelativePathString;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: Router.ExternalPathString;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `/`; params?: Router.UnknownInputParams }
        | { pathname: `/modal`; params?: Router.UnknownInputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | {
            pathname: `${"/(client-tabs)"}/bookings` | `/bookings`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/chat` | `/chat`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}` | `/`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/profile` | `/profile`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/search` | `/search`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/bookings` | `/bookings`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/chat` | `/chat`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}` | `/`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/services` | `/services`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/settings` | `/settings`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `${"/(tabs)"}` | `/`; params?: Router.UnknownInputParams }
        | {
            pathname: `${"/(tabs)"}/two` | `/two`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `/+not-found`; params: Router.UnknownInputParams & {} }
        | {
            pathname: `/chat/[id]`;
            params: Router.UnknownInputParams & { id: string | number };
          }
        | {
            pathname: `/service/[id]`;
            params: Router.UnknownInputParams & { id: string | number };
          };
      hrefOutputParams:
        | {
            pathname: Router.RelativePathString;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: Router.ExternalPathString;
            params?: Router.UnknownOutputParams;
          }
        | { pathname: `/`; params?: Router.UnknownOutputParams }
        | { pathname: `/modal`; params?: Router.UnknownOutputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams }
        | {
            pathname: `${"/(client-tabs)"}/bookings` | `/bookings`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/chat` | `/chat`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}` | `/`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/profile` | `/profile`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/search` | `/search`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/bookings` | `/bookings`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/chat` | `/chat`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}` | `/`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/services` | `/services`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/settings` | `/settings`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(tabs)"}` | `/`;
            params?: Router.UnknownOutputParams;
          }
        | {
            pathname: `${"/(tabs)"}/two` | `/two`;
            params?: Router.UnknownOutputParams;
          }
        | { pathname: `/+not-found`; params: Router.UnknownOutputParams & {} }
        | {
            pathname: `/chat/[id]`;
            params: Router.UnknownOutputParams & { id: string };
          }
        | {
            pathname: `/service/[id]`;
            params: Router.UnknownOutputParams & { id: string };
          };
      href:
        | Router.RelativePathString
        | Router.ExternalPathString
        | `/${`?${string}` | `#${string}` | ""}`
        | `/modal${`?${string}` | `#${string}` | ""}`
        | `/_sitemap${`?${string}` | `#${string}` | ""}`
        | `${"/(client-tabs)"}/bookings${`?${string}` | `#${string}` | ""}`
        | `/bookings${`?${string}` | `#${string}` | ""}`
        | `${"/(client-tabs)"}/chat${`?${string}` | `#${string}` | ""}`
        | `/chat${`?${string}` | `#${string}` | ""}`
        | `${"/(client-tabs)"}${`?${string}` | `#${string}` | ""}`
        | `/${`?${string}` | `#${string}` | ""}`
        | `${"/(client-tabs)"}/profile${`?${string}` | `#${string}` | ""}`
        | `/profile${`?${string}` | `#${string}` | ""}`
        | `${"/(client-tabs)"}/search${`?${string}` | `#${string}` | ""}`
        | `/search${`?${string}` | `#${string}` | ""}`
        | `${"/(provider-tabs)"}/bookings${`?${string}` | `#${string}` | ""}`
        | `/bookings${`?${string}` | `#${string}` | ""}`
        | `${"/(provider-tabs)"}/chat${`?${string}` | `#${string}` | ""}`
        | `/chat${`?${string}` | `#${string}` | ""}`
        | `${"/(provider-tabs)"}${`?${string}` | `#${string}` | ""}`
        | `/${`?${string}` | `#${string}` | ""}`
        | `${"/(provider-tabs)"}/services${`?${string}` | `#${string}` | ""}`
        | `/services${`?${string}` | `#${string}` | ""}`
        | `${"/(provider-tabs)"}/settings${`?${string}` | `#${string}` | ""}`
        | `/settings${`?${string}` | `#${string}` | ""}`
        | `${"/(tabs)"}${`?${string}` | `#${string}` | ""}`
        | `/${`?${string}` | `#${string}` | ""}`
        | `${"/(tabs)"}/two${`?${string}` | `#${string}` | ""}`
        | `/two${`?${string}` | `#${string}` | ""}`
        | {
            pathname: Router.RelativePathString;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: Router.ExternalPathString;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `/`; params?: Router.UnknownInputParams }
        | { pathname: `/modal`; params?: Router.UnknownInputParams }
        | { pathname: `/_sitemap`; params?: Router.UnknownInputParams }
        | {
            pathname: `${"/(client-tabs)"}/bookings` | `/bookings`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/chat` | `/chat`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}` | `/`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/profile` | `/profile`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(client-tabs)"}/search` | `/search`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/bookings` | `/bookings`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/chat` | `/chat`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}` | `/`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/services` | `/services`;
            params?: Router.UnknownInputParams;
          }
        | {
            pathname: `${"/(provider-tabs)"}/settings` | `/settings`;
            params?: Router.UnknownInputParams;
          }
        | { pathname: `${"/(tabs)"}` | `/`; params?: Router.UnknownInputParams }
        | {
            pathname: `${"/(tabs)"}/two` | `/two`;
            params?: Router.UnknownInputParams;
          }
        | `/+not-found${`?${string}` | `#${string}` | ""}`
        | `/chat/${Router.SingleRoutePart<T>}${`?${string}` | `#${string}` | ""}`
        | `/service/${Router.SingleRoutePart<T>}${`?${string}` | `#${string}` | ""}`
        | { pathname: `/+not-found`; params: Router.UnknownInputParams & {} }
        | {
            pathname: `/chat/[id]`;
            params: Router.UnknownInputParams & { id: string | number };
          }
        | {
            pathname: `/service/[id]`;
            params: Router.UnknownInputParams & { id: string | number };
          };
    }
  }
}
