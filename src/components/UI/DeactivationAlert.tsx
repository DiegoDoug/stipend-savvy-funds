import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DeactivationAlert() {
  const navigate = useNavigate();

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Account Deactivated</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>Your account is currently deactivated. You can view your data but cannot make changes.</span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/account')}
          className="ml-4 bg-background hover:bg-accent"
        >
          Reactivate Account
        </Button>
      </AlertDescription>
    </Alert>
  );
}
