import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Material } from "@/types/game";

interface MaterialsListProps {
  materials: Material[];
}

export const MaterialsList = ({ materials }: MaterialsListProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Materiais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <span className="font-medium text-foreground">{material.item}</span>
              <span className="text-sm text-muted-foreground">
                {material.responsiblePlayer}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
