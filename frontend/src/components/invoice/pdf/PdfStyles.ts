import { StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Roboto',
  fonts: [
    { src: '/fonts/Roboto-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Roboto-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Roboto-Bold.ttf', fontWeight: 700 },
  ],
});

export const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 30,
    fontFamily: 'Roboto',
    fontSize: 9,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerTitleContainer: {
    flex: 1.5,
    paddingRight: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  headerLogoContainer: {
    flex: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    height: 40,
    objectFit: 'contain',
  },
  headerInfoContainer: {
    flex: 1,
    paddingLeft: 15,
    alignItems: 'flex-end',
  },
  headerInfoRow: {
    flexDirection: 'row',
    marginBottom: 4,
    justifyContent: 'flex-end',
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerValue: {
    fontSize: 10,
    fontWeight: 'medium',
    marginLeft: 4,
  },
  divider: {
    borderTopWidth: 1.5,
    borderTopColor: '#9ca3af',
    marginVertical: 8,
  },
  partiesContainer: {
    flexDirection: 'row',
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: '#9ca3af',
    paddingVertical: 6,
  },
  partyCol: {
    flex: 1,
  },
  partyColLeft: {
    paddingRight: 15,
  },
  partyColRight: {
    paddingLeft: 15,
  },
  partyDivider: {
    width: 0.75,
    backgroundColor: '#9ca3af',
  },
  partyTitle: {
    fontWeight: 'bold',
    marginBottom: 3,
    fontSize: 9,
  },
  partyName: {
    fontWeight: 'bold',
    fontSize: 9,
    marginBottom: 2,
  },
  partyText: {
    fontSize: 9,
    marginBottom: 2,
    lineHeight: 1.4,
  },
  partyBankTitle: {
    fontWeight: 'bold',
    fontSize: 9,
    marginTop: 4,
    marginBottom: 1,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000000',
    marginTop: 8,
    marginBottom: 2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    backgroundColor: '#ffffff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableFooterRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    backgroundColor: '#ffffff',
  },
  tableCellHeader: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: 'bold',
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 9,
  },
  tableCellFooter: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: 'bold',
  },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  textLeft: { textAlign: 'left' },
  additionalInfoTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f2937',
  },
  additionalInfoRow: {
    fontSize: 9,
    marginBottom: 3,
    lineHeight: 1.4,
    color: '#000000',
    paddingLeft: 8,
  },
  additionalInfoBottom: {
    paddingBottom: 10,
  },
  sumWords: {
    fontSize: 9,
    marginTop: 0,
    marginBottom: 6,
    paddingLeft: 20,
  },
  notesContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  notesTitle: {
    fontWeight: 'bold',
    fontSize: 10,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    paddingLeft: 12,
  },
  notesTextBox: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 4,
    padding: 8,
  },
  signaturesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  signatureCol: {
    width: '45%',
  },
  signatureTitle: {
    fontWeight: 'bold',
    fontSize: 10,
    marginBottom: 3,
  },
  signatureName: {
    fontWeight: 'bold',
    fontSize: 9,
    marginBottom: 10,
  },
  signatureLineWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    marginTop: 25,
    position: 'relative',
  },
  signaturePositionLabel: {
    position: 'absolute',
    top: 2,
    left: 0,
    fontSize: 9,
  },
  signatureNameLabel: {
    position: 'absolute',
    top: 2,
    right: 0,
    fontSize: 9,
  },
  signatureImage: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    width: 80,
    height: 30,
    objectFit: 'contain',
  },
  sealImage: {
    position: 'absolute',
    bottom: -15,
    left: '30%',
    width: 80,
    height: 80,
    objectFit: 'contain',
  },
});
