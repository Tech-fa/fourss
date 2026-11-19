import { JoinColumn, Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { NCCorrectiveAction } from "./nc-corrective-action.entity";
import { RCACeCause } from "./rca-ce-cause.entity";
import { RCAFiveWhyStep } from "./rca-fivewhy-step.entity";

@Entity('nc_corrective_action_causes')
export class NCCorrectiveActionCauses {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => NCCorrectiveAction, { nullable: true })
    @JoinColumn({ name: 'nc_corrective_action_id' })
    ncCorrectiveAction: NCCorrectiveAction;

    @ManyToOne(() => RCACeCause, { nullable: true })
    @JoinColumn({ name: 'rca_cause_id' })
    rcaCause: RCACeCause;

    @ManyToOne(() => RCAFiveWhyStep, { nullable: true })
    @JoinColumn({ name: 'rca_five_why_step_id' })
    rcaFiveWhyStep: RCAFiveWhyStep;
}