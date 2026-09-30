import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Container from "../components/common/Container";
import ChatLayout from "../components/layout/ChatLayout";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatConversation from "../components/chat/ChatConversation";
import { useGetConversationsQuery, useGetConversationQuery } from "../store/api/chatApi";
import { useAuth } from "../context/AuthContext";

const ChatDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // RTK Query hooks with polling
  const { data: conversations = [], isLoading: conversationsLoading } = useGetConversationsQuery(undefined, {
    pollingInterval: 60000, // Poll every 60 seconds
  });

  const { data: conversation, isLoading: conversationLoading } = useGetConversationQuery(userId!, {
    skip: !userId,
    pollingInterval: 15000, // Poll every 15 seconds for active conversation
  });

  const isLoading = conversationsLoading || conversationLoading;

  // Format conversations with required fields
  const formattedConversations = useMemo(() => {
    return conversations.map((conv) => ({
      ...conv,
      formattedTime: conv.lastMessage?.createdAt
        ? new Date(conv.lastMessage.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : "",
      preview: conv.lastMessage?.content || "No messages yet",
    }));
  }, [conversations]);

  // Find active conversation from conversations list
  const activeConversation = conversations.find((conv: any) =>
    conv.user?._id === userId || conv.user?.id === userId
  );

  // Format messages with required fields
  const formattedMessages = useMemo(() => {
    const messages = Array.isArray(conversation) ? conversation : [];
    return messages.map((msg) => ({
      ...msg,
      formattedTime: msg.createdAt
        ? new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : "",
    }));
  }, [conversation]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="bg-Dark">
      <Container className="py-4 md:py-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-[#212428] rounded-lg overflow-hidden shadow-lg"
        >
          <ChatLayout>
            <ChatSidebar
              conversations={formattedConversations}
              activeId={userId}
              isLoading={conversationsLoading}
            />
            <ChatConversation
              messages={formattedMessages}
              recipientId={userId || ""}
              recipientName={activeConversation?.user?.name || "User"}
              recipientImage={activeConversation?.user?.profileImage || ""}
              currentUserId={user?._id || ""}
              isLoading={conversationLoading}
            />
          </ChatLayout>
        </motion.div>
      </Container>
    </div>
  );
};

export default ChatDetail;
