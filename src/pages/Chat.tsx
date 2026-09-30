import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Container from "../components/common/Container";
import ChatLayout from "../components/layout/ChatLayout";
import ChatSidebar from "../components/chat/ChatSidebar";
import ChatEmpty from "../components/chat/ChatEmpty";
import { useGetConversationsQuery } from "../store/api/chatApi";
import { useAuth } from "../context/AuthContext";

const Chat = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // RTK Query hook with polling
  const { data: conversations = [], isLoading } = useGetConversationsQuery(undefined, {
    pollingInterval: 60000, // Poll every 60 seconds
  });

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="bg-Dark">
      <Container className="py-4 md:py-6 ">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-[#212428] rounded-lg overflow-hidden shadow-lg"
        >
          <ChatLayout>
            <ChatSidebar
              conversations={formattedConversations}
              isLoading={isLoading}
            />
            <ChatEmpty />
          </ChatLayout>
        </motion.div>
      </Container>
    </div>
  );
};

export default Chat;
