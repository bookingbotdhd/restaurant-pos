import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
export declare class IntegrationApiKeyGuard implements CanActivate {
    private readonly prisma;
    private readonly reflector;
    private readonly limiter;
    private readonly writeLimit;
    private readonly readLimit;
    constructor(prisma: PrismaService, reflector: Reflector);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
