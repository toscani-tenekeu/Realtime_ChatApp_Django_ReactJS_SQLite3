import { ApiAuthService } from "@/services/auth/ApiAuthService";
import { ApiChatService } from "@/services/chat/ApiChatService";
import { ApiUserService } from "@/services/users/ApiUserService";

// Swap these exports with fetch-based implementations of the same interfaces
// (see `services/types.ts`) when wiring to your Django backend.
export const authService = new ApiAuthService();
export const chatService = new ApiChatService();
export const userService = new ApiUserService();
