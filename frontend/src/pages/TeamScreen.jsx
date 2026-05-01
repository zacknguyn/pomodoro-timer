import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Team screen now lives at /groups
const TeamScreen = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/groups', { replace: true }); }, [navigate]);
  return null;
};

export default TeamScreen;
