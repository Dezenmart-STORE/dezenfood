import { baseApi } from './baseApi';
import type { Message, Conversation, SendMessageParams, MarkReadParams } from '../../utils/types';

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all conversations
    getConversations: builder.query<Conversation[], void>({
      query: () => '/messages',
      providesTags: ['Conversations'],
    }),

    // Get conversation/messages with a specific user
    getConversation: builder.query<Message[], string>({
      query: (userId) => `/messages/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'Messages', id: userId }],
    }),

    // Send message
    sendMessage: builder.mutation<Message, SendMessageParams>({
      query: (data) => ({
        url: '/messages',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, data) => [
        { type: 'Messages', id: data.recipient },
        'Conversations',
      ],
      // Optimistic update
      async onQueryStarted(data, { dispatch, queryFulfilled }) {
        const optimisticMessage: Partial<Message> = {
          _id: `temp-${crypto.randomUUID()}`,
          content: data.content,
          sender: 'current-user', // Will be replaced with actual user
          recipient: data.recipient,
          read: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const patchResult = dispatch(
          chatApi.util.updateQueryData('getConversation', data.recipient, (draft) => {
            draft.push(optimisticMessage as Message);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    // Mark messages as read
    markMessagesAsRead: builder.mutation<{ success: boolean }, MarkReadParams>({
      query: (params) => ({
        url: '/messages/mark-read',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: params,
      }),
      invalidatesTags: ['Messages', 'Conversations'],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetConversationQuery,
  useSendMessageMutation,
  useMarkMessagesAsReadMutation,
} = chatApi;
