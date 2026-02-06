// Déclarations de type pour @vercel/node
// Ce module est fourni par Vercel lors du déploiement
declare module '@vercel/node' {
  export interface VercelRequest {
    method?: string;
    body?: any;
    query?: Record<string, string | string[]>;
    headers?: Record<string, string | string[]>;
    url?: string;
  }

  export interface VercelResponse {
    status: (code: number) => VercelResponse;
    json: (body: any) => void;
    send: (body: any) => void;
    setHeader: (name: string, value: string | string[]) => void;
    end: (chunk?: any) => void;
  }
}

// Déclarations de type pour nodemailer
// Les types sont normalement inclus avec nodemailer, mais cette déclaration aide TypeScript
declare module 'nodemailer' {
  export interface TransportOptions {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user: string;
      pass: string;
    };
    tls?: {
      rejectUnauthorized?: boolean;
    };
    connectionTimeout?: number;
    greetingTimeout?: number;
    socketTimeout?: number;
  }

  export interface SendMailOptions {
    from?: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
  }

  export interface SentMessageInfo {
    messageId: string;
  }

  export interface Transporter {
    verify(): Promise<void>;
    sendMail(options: SendMailOptions): Promise<SentMessageInfo>;
  }

  export function createTransport(options: TransportOptions): Transporter;
  
  const nodemailer: {
    createTransport: (options: TransportOptions) => Transporter;
  };
  
  export default nodemailer;
}

