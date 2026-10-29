'use client';

import { CheckCheckIcon } from 'lucide-react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const FormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  type: z.string().min(1, { message: 'Select a project type.' }),
  goal: z.string().min(1, { message: 'Choose your primary goal.' }),
  brief: z
    .string()
    .min(30, 'Please describe your project (min 30 characters).'),
});

const Form10 = () => {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: '',
      type: '',
      goal: '',
      brief: '',
    },
  });

  const onSubmit = () => {
    toast.custom(() => (
      <Alert className="border-success text-success flex items-center gap-2 sm:w-122">
        <CheckCheckIcon className="size-4" />
        <AlertTitle>Your project setup is complete</AlertTitle>
      </Alert>
    ));
  };

  return (
    <Card className="bg-card w-full max-w-sm rounded-sm ">
      <CardHeader>
        <CardTitle>Create New Project</CardTitle>
        <CardDescription>
          Tell us about your project so we can tailor the experience for you.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Field>
            <FieldLabel>Work Email</FieldLabel>
            <FieldContent>
              <Input
                placeholder="you@company.com"
                {...form.register('email')}
                className="focus-visible:ring-primary/20 focus-visible:border-primary/50 bg-muted rounded-sm  transition-all focus:scale-[1.01] "
              />
            </FieldContent>
            <FieldDescription>
              We'll use this to set up your workspace.
            </FieldDescription>
            <FieldError className="bg-destructive/10 border-destructive rounded-sm border p-1 text-xs  ">
              {form.formState.errors.email?.message}
            </FieldError>
          </Field>

          <Field>
            <FieldLabel>Project Type</FieldLabel>
            <FieldContent>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger className="bg-muted w-full rounded-sm  ">
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent className="bg-muted rounded-sm  ">
                      <SelectItem value="web">Web Application</SelectItem>
                      <SelectItem value="mobile">Mobile App</SelectItem>
                      <SelectItem value="saas">SaaS Platform</SelectItem>
                      <SelectItem value="internal">Internal Tool</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldContent>
            <FieldError className="bg-destructive/10 border-destructive rounded-sm border p-1 text-xs  ">
              {form.formState.errors.type?.message}
            </FieldError>
          </Field>

          <Field>
            <FieldLabel>Primary Goal</FieldLabel>
            <FieldContent>
              <Controller
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex w-full gap-2"
                  >
                    {[
                      { value: 'launch', label: 'Launch' },
                      { value: 'scale', label: 'Scale' },
                      { value: 'experiment', label: 'Prototype' },
                    ].map((item) => {
                      const isActive = field.value === item.value;

                      return (
                        <label
                          key={item.value}
                          htmlFor={item.value}
                          className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm border px-3 py-2 text-xs transition-all ${isActive ? 'border-primary bg-primary/10' : 'bg-muted border-border/50 hover:bg-muted'} `}
                        >
                          <RadioGroupItem
                            value={item.value}
                            id={item.value}
                            className="hidden"
                          />
                          <span>{item.label}</span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                )}
              />
            </FieldContent>
            <FieldError className="bg-destructive/10 border-destructive rounded-sm border p-1 text-xs  ">
              {form.formState.errors.goal?.message}
            </FieldError>
          </Field>

          <Field>
            <FieldLabel>Project Brief</FieldLabel>
            <FieldContent>
              <Textarea
                placeholder="Describe what you're building and what problem it solves..."
                {...form.register('brief')}
                className="focus-visible:ring-primary/20 focus-visible:border-primary/50 bg-muted rounded-sm  transition-all focus:scale-[1.01] "
              />
            </FieldContent>
            <FieldDescription>
              The more context you provide, the better we can assist you.
            </FieldDescription>
            <FieldError className="bg-destructive/10 border-destructive rounded-sm border p-1 text-xs  ">
              {form.formState.errors.brief?.message}
            </FieldError>
          </Field>

          <Button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-sm transition-all hover:scale-[1.02] active:scale-95"
          >
            Create Project
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default Form10;
