import { MockAuthService } from "@/services/auth/MockAuthService";
import { MockChatService } from "@/services/chat/MockChatService";
import { MockUserService } from "@/services/users/MockUserService";

// Swap these exports with fetch-based implementations of the same interfaces
// (see `services/types.ts`) when wiring to your Django backend.
export const authService = new MockAuthService();
export const chatService = new MockChatService();
export const userService = new MockUserService();
