import { Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';
import { ApiService } from './api.service';
import { Song, SongPurchaseResponse } from '../models';
import { environment } from '../../environments/environment';

declare var google: any;

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private paymentsClient: any = null;

  constructor(private api: ApiService) {}

  private getPaymentsClient(): any {
    if (!this.paymentsClient) {
      this.paymentsClient = new google.payments.api.PaymentsClient({
        environment: environment.googlePay.environment
      });
    }
    return this.paymentsClient;
  }

  private getBaseCardPaymentMethod(): any {
    return {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['MASTERCARD', 'VISA', 'AMEX', 'DISCOVER']
      }
    };
  }

  private getTokenizationSpecification(): any {
    return {
      type: 'PAYMENT_GATEWAY',
      parameters: {
        gateway: 'example',
        gatewayMerchantId: environment.googlePay.merchantId
      }
    };
  }

  isReadyToPay(): Promise<boolean> {
    const request = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [this.getBaseCardPaymentMethod()]
    };

    try {
      const client = this.getPaymentsClient();
      return client.isReadyToPay(request).then((response: any) => response.result);
    } catch {
      return Promise.resolve(false);
    }
  }

  requestPayment(song: Song): Promise<string> {
    const paymentDataRequest = {
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        ...this.getBaseCardPaymentMethod(),
        tokenizationSpecification: this.getTokenizationSpecification()
      }],
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: song.price.toFixed(2),
        currencyCode: 'USD',
        countryCode: 'US'
      },
      merchantInfo: {
        merchantId: environment.googlePay.merchantId,
        merchantName: environment.googlePay.merchantName
      }
    };

    const client = this.getPaymentsClient();
    return client.loadPaymentData(paymentDataRequest)
      .then((paymentData: any) => {
        return paymentData.paymentMethodData.tokenizationData.token;
      });
  }

  purchaseSong(songId: string, paymentToken: string): Observable<SongPurchaseResponse> {
    return this.api.post<SongPurchaseResponse>(`/songs/${songId}/purchase`, {
      paymentToken
    });
  }

  purchaseWithGooglePay(song: Song): Observable<SongPurchaseResponse> {
    return from(this.requestPayment(song)).pipe(
      switchMap(token => this.purchaseSong(song.id, token))
    );
  }

  getPurchasedSongs(): Observable<Song[]> {
    return this.api.get<Song[]>('/songs/purchased');
  }
}
