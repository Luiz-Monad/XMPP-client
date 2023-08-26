
import HumanModel from 'human-model';


const ContactRequest = HumanModel.define({
    type: 'contactRequest',
    props: {
        jid: ['string', true, '']
    }
});

export default ContactRequest;
export type ContactRequestType = InstanceType<typeof ContactRequest>;
