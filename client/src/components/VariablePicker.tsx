import * as React from "react";
import { Code2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { DYNAMIC_VARIABLES } from "@shared/dynamicVariables";

interface VariablePickerProps {
  onSelectVariable: (placeholder: string) => void;
  disabled?: boolean;
}

export function VariablePicker({ onSelectVariable, disabled }: VariablePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (placeholder: string) => {
    onSelectVariable(placeholder);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          disabled={disabled}
          data-testid="button-variable-picker"
        >
          <Code2 className="h-3.5 w-3.5" />
          Variables
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <Command>
          <CommandInput placeholder="Buscar variable..." data-testid="input-variable-search" />
          <CommandList>
            <CommandEmpty>No se encontraron variables.</CommandEmpty>
            <CommandGroup heading="Variables Dinámicas">
              {DYNAMIC_VARIABLES.map((variable) => (
                <CommandItem
                  key={variable.key}
                  value={`${variable.key} ${variable.description}`}
                  onSelect={() => handleSelect(variable.placeholder)}
                  className="flex flex-col items-start gap-1 cursor-pointer py-2"
                  data-testid={`variable-item-${variable.key}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                      {variable.placeholder}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-normal leading-relaxed">
                    {variable.description}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
